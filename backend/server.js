require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const connectDB = require('./config/db');
const EsgCompany = require('./models/EsgCompany');
const EsgReport = require('./models/EsgReport');
const {
  METRICS_CONFIG, computeDerivedMetrics, computeSectorStats,
  computePercentileRank, computeNormalizedScore, computePillarScores,
  computeGapAnalysis, computeRadarData, computeStrengthsWeaknesses,
} = require('./utils/benchmarkCalculations');

const app = express();
app.use(cors());
app.use(express.json());
connectDB();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Helper: build full benchmark for a company ──────────────────────────────
async function buildBenchmark(companyId) {
  const company = await EsgCompany.findById(companyId);
  if (!company) throw new Error('Company not found');
  const allCompanies = await EsgCompany.find({});
  const { enriched, stats } = computeSectorStats(allCompanies);
  const enrichedCompany = computeDerivedMetrics(company);

  const percentiles = {};
  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const allVals = enriched.map((c) => c[metric]);
    percentiles[metric] = computePercentileRank(enrichedCompany[metric], allVals, config.lowerIsBetter);
  });

  const normalizedScores = {};
  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const ms = stats[metric];
    if (ms) normalizedScores[metric] = computeNormalizedScore(enrichedCompany[metric], ms.min, ms.max, config.lowerIsBetter);
  });

  const pillarScores = computePillarScores(enrichedCompany, stats);
  const overall =
    pillarScores.environmental != null && pillarScores.social != null && pillarScores.governance != null
      ? Math.round((pillarScores.environmental + pillarScores.social + pillarScores.governance) / 3)
      : null;

  const gapAnalysis = computeGapAnalysis(enrichedCompany, enriched, stats);
  const radarData = computeRadarData(enrichedCompany, enriched, stats);
  const { strengths, weaknesses, opportunities } = computeStrengthsWeaknesses(percentiles);

  const heatmapMetrics = [
    'scope_1','scope_2','renewable_energy_pct','water_consumption',
    'gender_diversity_pct','board_women_percent','ltifr',
    'employee_turnover_rate','independent_directors_percent','data_breaches',
  ];
  const heatmapData = enriched.map((c) => {
    const row = { company_name: c.company_name, _id: c._id?.toString() };
    heatmapMetrics.forEach((m) => {
      const ms = stats[m];
      const config = METRICS_CONFIG[m];
      if (ms && config) row[m] = computeNormalizedScore(c[m], ms.min, ms.max, config.lowerIsBetter);
    });
    return row;
  });

  // Box plot data: per metric distribution + company position
  const boxplotData = Object.entries(METRICS_CONFIG).map(([metric, config]) => {
    const ms = stats[metric];
    return {
      metric,
      label: config.label,
      unit: config.unit,
      pillar: config.pillar,
      lowerIsBetter: config.lowerIsBetter,
      companyValue: enrichedCompany[metric] ?? null,
      min: ms?.min ?? null,
      max: ms?.max ?? null,
      p25: ms?.p25 ?? null,
      p50: ms?.p50 ?? null,
      p75: ms?.p75 ?? null,
      avg: ms?.avg ?? null,
    };
  });

  // Composition data
  const femaleEmployees = enrichedCompany.female_employees ?? 0;
  const totalEmployees = enrichedCompany.employees ?? 0;
  const maleEmployees = Math.max(totalEmployees - femaleEmployees, 0);
  const genderComposition = totalEmployees > 0
    ? [{ name: 'Female', value: femaleEmployees }, { name: 'Male', value: maleEmployees }]
    : null;

  const boardWomenPct = enrichedCompany.board_women_percent ?? null;
  const indirPct = enrichedCompany.independent_directors_percent ?? null;
  const boardComposition = boardWomenPct != null
    ? [{ name: 'Women', value: parseFloat(boardWomenPct.toFixed(1)) }, { name: 'Men', value: parseFloat((100 - boardWomenPct).toFixed(1)) }]
    : null;
  const boardIndComposition = indirPct != null
    ? [{ name: 'Independent', value: parseFloat(indirPct.toFixed(1)) }, { name: 'Non-Independent', value: parseFloat((100 - indirPct).toFixed(1)) }]
    : null;

  // Net zero timeline data
  const netZeroRanked = enriched
    .filter((c) => c.net_zero_target_year != null && c.net_zero_target_year > 2020)
    .map((c) => ({ _id: c._id?.toString(), company_name: c.company_name, value: c.net_zero_target_year }))
    .sort((a, b) => a.value - b.value);

  return {
    company: { ...enrichedCompany, _id: company._id?.toString() },
    pillarScores: { ...pillarScores, overall },
    percentiles,
    normalizedScores,
    gapAnalysis,
    radarData,
    strengths,
    weaknesses,
    opportunities,
    sectorStats: stats,
    boxplotData,
    genderComposition,
    boardComposition,
    boardIndComposition,
    netZeroRanked,
    peerCount: enriched.length,
    heatmapData,
    heatmapMetrics,
  };
}

// ─── Standard REST endpoints ──────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.get('/api/companies', async (_, res) => {
  try {
    const companies = await EsgCompany.find({}).sort({ company_name: 1 });
    res.json(companies);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/companies/sectors', async (_, res) => {
  try {
    const sectors = await EsgCompany.distinct('sector');
    res.json(sectors.filter(Boolean).sort());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const company = await EsgCompany.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Not found' });
    res.json(company);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/benchmarks/company/:id', async (req, res) => {
  try {
    const data = await buildBenchmark(req.params.id);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/benchmarks/peer-comparison', async (req, res) => {
  try {
    const oilGasCompanies = await EsgCompany.find({}, 'company_name bse_code _id');
    const nameList = oilGasCompanies.map((c) => c.company_name);
    const reports = await EsgReport.find({ company_name: { $in: nameList } });
    const oilGasMap = Object.fromEntries(oilGasCompanies.map((c) => [c.company_name, c._id]));
    const data = reports.map((r) => ({
      _id: r._id,
      company_name: r.company_name,
      sector: r.sector,
      esg_score:         parseFloat(r.esg_score)         || null,
      environment_score: parseFloat(r.environment_score) || null,
      social_score:      parseFloat(r.social_score)      || null,
      governance_score:  parseFloat(r.governance_score)  || null,
      latest_report_date: r.latest_report_date,
      coverage: r.coverage,
      oil_gas_id: oilGasMap[r.company_name] || null,
    })).sort((a, b) => a.company_name.localeCompare(b.company_name));
    res.json({ companies: data, total: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Gemini Function Declarations ─────────────────────────────────────────────
const FUNCTION_DECLARATIONS = [
  {
    name: 'get_companies',
    description: 'List all companies in the ESG database with their names, BSE codes, and sectors.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_company_benchmark',
    description: 'Fetch full ESG benchmark analysis for a company: pillar scores (E/S/G), percentile rankings, gap analysis, strengths, weaknesses, and radar chart data.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'MongoDB _id of the company' },
      },
      required: ['company_id'],
    },
  },
  {
    name: 'get_metric_ranking',
    description: 'Get sector-wide ranking for a specific ESG metric, all companies sorted by performance.',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'One of: scope_1, scope_2, emissions_intensity, renewable_energy_pct, water_consumption, total_waste, gender_diversity_pct, board_women_percent, ltifr, employee_turnover_rate, pay_equity_ratio, independent_directors_percent, data_breaches, net_zero_target_year',
        },
      },
      required: ['metric'],
    },
  },
  {
    name: 'get_sector_stats',
    description: 'Get aggregate sector statistics (min, max, average, percentiles) for all ESG metrics.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_peer_comparison',
    description: 'Fetch ESG scores (Overall, Environmental, Social, Governance) for all oil & gas peers from the external ESG ratings database. Use this for peer comparison, competitive benchmarking, scatter plots, ranking tables, or questions about how a company stacks up against all competitors.',
    parameters: {
      type: 'object',
      properties: {
        selected_company_name: { type: 'string', description: 'Optional: company name to highlight in the comparison charts' },
      },
    },
  },
  {
    name: 'generate_report',
    description: 'Generate a complete ESG analysis report with ALL charts and ALL sections (Environmental, Social, Governance, Peer Comparison). Call this when the user asks for a full report, complete analysis, PDF, or comprehensive overview of everything.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_recommendations',
    description: 'Generate 5 prioritized AI recommendations for improving ESG scores with impact estimates and effort levels. Use when user asks for recommendations, improvement plan, action items, or what to focus on.',
    parameters: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'MongoDB _id of the company' },
      },
      required: ['company_id'],
    },
  },
  {
    name: 'suggest_charts',
    description: `After fetching data, call this to specify ONLY the charts that directly answer the user's question. Pick 1-2 charts maximum — never repeat similar charts.

Available chart keys and when to use them:
- "pillars"       → E/S/G donut gauges          → "overall score", "ESG score", "pillar scores"
- "radar"         → Radar profile vs sector      → "ESG profile", "overview", "how do we compare overall"
- "treemap"       → All metric scores overview   → "show all metrics", "full overview"
- "waterfall"     → Percentile gap per metric    → "strengths/weaknesses", "where do we stand", "gap vs peers", "improve overall"
- "boxplots_env"  → Environmental distributions → "emissions", "scope 1/2", "renewable", "water", "waste", "environmental score"
- "boxplots_soc"  → Social distributions        → "social score", "turnover", "LTIFR", "pay equity", "social metrics"
- "boxplots_gov"  → Governance distributions    → "governance score", "directors", "data breaches", "governance metrics"
- "donut_gender"  → Gender composition          → "gender diversity", "female employees", "workforce diversity"
- "donut_board"   → Board gender composition    → "board women", "board gender", "board diversity"
- "donut_indir"   → Board independence          → "independent directors", "board independence", "governance structure"
- "netzero"       → Net zero timeline           → "net zero", "climate target", "carbon neutral", "2050"
- "heatmap"        → Peer comparison heatmap     → "compare to peers", "peer comparison", "how do we rank overall"
- "percentilebar"  → Percentile ranking bars     → ranking for a single specific metric
- "peer_bars"      → 2×2 peer score bar charts   → "peer scores", "how do all companies compare", "score distribution"
- "gap_leader"     → Gap to sector leader bars   → "gap to leader", "how far behind the best", "distance from top"
- "env_scatter"    → Environmental vs Social scatter → "env vs social", "quadrant", "scatter", "positioning"
- "pillar_stacked" → Top-8 stacked pillar chart  → "pillar breakdown", "stacked comparison", "top companies breakdown"
- "recommendations" → AI recommendation cards + improvement simulator → "recommendations", "what should we improve", "action plan", "how to improve ESG"
- "report"         → Full ESG report (ALL sections) → "full report", "generate report", "full analysis", "PDF", "complete report", "all charts"

STRICT RULES:
- NEVER suggest both "waterfall" AND another gap-type chart in the same response
- For emissions questions → use ["boxplots_env"] only
- For social questions → use ["boxplots_soc"] only
- For governance questions → use ["boxplots_gov"] only
- For improvement/gap questions → use ["waterfall"] only
- For profile/overview → use ["radar"] only
- For peer score comparison → use ["peer_bars"] only
- For gap to sector leader → use ["gap_leader"] only
- For env vs social positioning → use ["env_scatter"] only
- For top-8 pillar breakdown → use ["pillar_stacked"] only
- For recommendations / action plan / what to improve → call get_recommendations, then ["recommendations"]
- For full report / all charts / PDF → FIRST call generate_report (no other tools needed), THEN suggest_charts(["report"])`,
    parameters: {
      type: 'object',
      properties: {
        chart_keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of chart keys to display. Pick only what is relevant to the question.',
        },
      },
      required: ['chart_keys'],
    },
  },
];

// ─── Tool Execution ───────────────────────────────────────────────────────────
async function executeTool(name, args) {
  if (name === 'get_companies') {
    const companies = await EsgCompany.find({}).sort({ company_name: 1 }).select('_id company_name bse_code sector');
    const list = companies.map((c) => ({ id: c._id.toString(), name: c.company_name, bse_code: c.bse_code, sector: c.sector }));
    return { companies: list, count: list.length, summary: `Found ${list.length} companies` };
  }

  if (name === 'get_company_benchmark') {
    const data = await buildBenchmark(args.company_id);
    return {
      ...data,
      summary: `Benchmark for ${data.company.company_name}: Overall ${data.pillarScores.overall}/100 (E:${data.pillarScores.environmental} S:${data.pillarScores.social} G:${data.pillarScores.governance}). ${data.strengths.length} strengths, ${data.weaknesses.length} weaknesses.`,
    };
  }

  if (name === 'get_metric_ranking') {
    const { metric } = args;
    const config = METRICS_CONFIG[metric];
    if (!config) throw new Error(`Unknown metric: ${metric}`);
    const companies = await EsgCompany.find({});
    const { enriched, stats } = computeSectorStats(companies);
    const ms = stats[metric];
    const ranked = enriched
      .filter((c) => c[metric] != null)
      .map((c) => ({
        id: c._id?.toString(),
        company_name: c.company_name,
        value: c[metric],
        normalizedScore: computeNormalizedScore(c[metric], ms?.min, ms?.max, config.lowerIsBetter),
        percentile: computePercentileRank(c[metric], enriched.map((x) => x[metric]), config.lowerIsBetter),
      }))
      .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0));
    return {
      metric, label: config.label, unit: config.unit,
      lowerIsBetter: config.lowerIsBetter, ranked, stats: ms,
      summary: `Rankings for ${config.label}: ${ranked.length} companies. Leader: ${ranked[0]?.company_name} (${ranked[0]?.value?.toFixed(2)} ${config.unit})`,
    };
  }

  if (name === 'get_sector_stats') {
    const companies = await EsgCompany.find({});
    const { stats } = computeSectorStats(companies);
    return { stats, summary: `Sector stats loaded for ${Object.keys(stats).length} metrics.` };
  }

  if (name === 'generate_report') {
    return { success: true, summary: 'Full ESG report triggered' };
  }

  if (name === 'get_peer_comparison') {
    const oilGasCompanies = await EsgCompany.find({}, 'company_name bse_code _id');
    const nameList = oilGasCompanies.map((c) => c.company_name);
    const reports = await EsgReport.find({ company_name: { $in: nameList } });
    const oilGasMap = Object.fromEntries(oilGasCompanies.map((c) => [c.company_name, c._id]));
    const companies = reports.map((r) => ({
      _id: r._id?.toString(),
      company_name: r.company_name,
      esg_score:         parseFloat(r.esg_score)         || null,
      environment_score: parseFloat(r.environment_score) || null,
      social_score:      parseFloat(r.social_score)      || null,
      governance_score:  parseFloat(r.governance_score)  || null,
      latest_report_date: r.latest_report_date,
      oil_gas_id: oilGasMap[r.company_name]?.toString() || null,
    })).sort((a, b) => a.company_name.localeCompare(b.company_name));
    const selectedName = args.selected_company_name || null;
    const count = companies.length;
    return {
      companies,
      selectedName,
      summary: `Peer comparison loaded: ${count} companies.${selectedName ? ` Highlighted: ${selectedName}.` : ''}`,
    };
  }

  if (name === 'get_recommendations') {
    const data = await buildBenchmark(args.company_id);
    const { weaknesses, opportunities, strengths, gapAnalysis, percentiles,
            pillarScores, sectorStats, company, peerCount } = data;

    // Exclude data_breaches from recommendations
    const excludeMetrics = ['data_breaches'];
    const filteredWeaknesses = weaknesses.filter((w) => !excludeMetrics.includes(w.metric));
    const filteredOpportunities = opportunities.filter((o) => !excludeMetrics.includes(o.metric));

    // Build rich per-metric context with company value, leader, avg, rank, peers
    const allCompanies = await EsgCompany.find({});
    const { enriched } = computeSectorStats(allCompanies);
    const metricDetails = {};
    Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
      if (excludeMetrics.includes(metric)) return;
      const gap = gapAnalysis[metric];
      if (!gap) return;
      // Build ranking for this metric
      const vals = enriched
        .filter((c) => c[metric] != null)
        .map((c) => ({ name: c.company_name, value: c[metric] }))
        .sort((a, b) => config.lowerIsBetter ? a.value - b.value : b.value - a.value);
      const companyRank = vals.findIndex((v) => v.name === company.company_name) + 1;
      const top3 = vals.slice(0, 3).map((v) => `${v.name} (${typeof v.value === 'number' ? v.value.toFixed(1) : v.value}${config.unit === '%' ? '%' : ''})`);

      metricDetails[metric] = {
        label: config.label,
        pillar: config.pillar,
        unit: config.unit,
        lowerIsBetter: config.lowerIsBetter,
        companyValue: gap.companyValue,
        sectorAvg: gap.avgValue,
        leaderValue: gap.leaderValue,
        leaderName: gap.leaderName,
        percentile: percentiles[metric],
        rank: companyRank,
        totalPeers: vals.length,
        top3Leaders: top3,
        sectorP25: sectorStats[metric]?.p25,
        sectorP50: sectorStats[metric]?.p50,
        sectorP75: sectorStats[metric]?.p75,
      };
    });

    const context = {
      company_name: company.company_name,
      sector: 'Oil & Gas',
      pillarScores,
      peerCount,
      weaknesses: filteredWeaknesses,
      opportunities: filteredOpportunities,
      strengths,
      metricDetails,
    };

    const recModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 6000,
      },
    });

    const recPrompt = `You are an expert ESG strategy advisor specializing in the oil & gas sector. Given this company's detailed benchmark data with peer rankings, generate exactly 5 high-impact, actionable recommendations.

Company: ${context.company_name}
Sector: Oil & Gas (${context.peerCount} peers)
Current Scores: E=${context.pillarScores.environmental}/100, S=${context.pillarScores.social}/100, G=${context.pillarScores.governance}/100, Overall=${context.pillarScores.overall}/100

DETAILED METRIC DATA (with peer rankings, leader names, sector stats):
${JSON.stringify(context.metricDetails, null, 2)}

WEAKNESSES (bottom 25th %ile): ${JSON.stringify(context.weaknesses)}
OPPORTUNITIES (25-50th %ile): ${JSON.stringify(context.opportunities)}
STRENGTHS (top 25th %ile): ${JSON.stringify(context.strengths)}

Write recommendations in this style — specific, data-rich, mentioning real peer names and exact numbers:

EXAMPLE TITLE: "Close the Gender Leadership Gap — 29% → 35% Women in VP+ Roles"
EXAMPLE DESCRIPTION: "You rank #6 of 10 peers on women in leadership. ONGC (38%) and BPCL (40%) are setting the standard. A 6pp improvement would move you to #3, ahead of GAIL and IOCL. Investors including major ESG funds have flagged this as a key engagement priority for oil & gas companies."

Return a JSON array of exactly 5 objects, each with:
- "id": number 1-5 (priority order, 1 = most impactful)
- "title": specific action with current → target numbers using actual company data. Use the format: "Action Description — X% → Y% Metric" or "Reduce X from Y to Z"
- "description": 2-3 rich sentences that MUST include: (a) the company's exact rank among peers, (b) names of 1-2 top-performing peers with their values, (c) what specific improvement would change the ranking, (d) reference to an ESG framework or investor concern where relevant
- "tags": 2-3 tag objects [{label, color}]. Colors: "green" (environmental), "blue" (social), "purple" (governance), "yellow" (framework/rating impact like "S&P CSA: +5 pts"), "orange" (future-proofing)
- "esg_impact_pts": integer 1-15 (estimated overall ESG score improvement)
- "effort_level": "LOW" | "MED" | "HIGH"
- "affected_metrics": [{metric_key, current_percentile, target_percentile}] — use EXACT metric_key names from the data, use actual current_percentile from data, set realistic target_percentile
- "pillar": "environmental" | "social" | "governance"

RULES:
- Do NOT include "data_breaches" in any recommendation
- Use REAL company names from the top3Leaders data
- Use ACTUAL values and percentiles from the metricDetails
- Title must contain specific numbers (current → target)
- Description must name at least one peer competitor
- Mix of E, S, G pillars across the 5 recommendations
- Prioritize: (1) weaknesses with largest gap, (2) quick wins, (3) protect strengths`;

    let recommendations;
    try {
      const recResult = await recModel.generateContent(recPrompt);
      recommendations = JSON.parse(recResult.response.text());
    } catch (parseErr) {
      // Fallback: generate data-rich recommendations from weaknesses/opportunities
      recommendations = [...filteredWeaknesses, ...filteredOpportunities].slice(0, 5).map((item, idx) => {
        const md = metricDetails[item.metric];
        const pillarLabel = METRICS_CONFIG[item.metric]?.pillar === 'environmental' ? 'Environmental'
          : METRICS_CONFIG[item.metric]?.pillar === 'social' ? 'Social' : 'Governance';
        const pillarColor = METRICS_CONFIG[item.metric]?.pillar === 'environmental' ? 'green'
          : METRICS_CONFIG[item.metric]?.pillar === 'social' ? 'blue' : 'purple';
        const targetVal = md ? (md.lowerIsBetter ? md.sectorP50 : md.sectorP50) : null;
        const currentVal = md?.companyValue;
        const titleNum = currentVal != null && targetVal != null
          ? ` — ${currentVal.toFixed(1)} → ${targetVal.toFixed(1)} ${md.unit}`
          : '';

        return {
          id: idx + 1,
          title: `Improve ${item.label}${titleNum}`,
          description: md
            ? `You rank #${md.rank} of ${md.totalPeers} peers. ${md.leaderName} leads at ${md.leaderValue?.toFixed(1)} ${md.unit}. Moving to the sector median (${md.sectorP50?.toFixed(1)}) would boost your ${md.pillar} pillar score significantly.`
            : `Currently at ${item.percentile}th percentile. Improving to sector median would boost your ${pillarLabel.toLowerCase()} score.`,
          tags: [{ label: pillarLabel, color: pillarColor }],
          esg_impact_pts: Math.max(1, Math.round((50 - item.percentile) / 5)),
          effort_level: item.percentile <= 25 ? 'HIGH' : 'MED',
          affected_metrics: [{ metric_key: item.metric, current_percentile: item.percentile, target_percentile: Math.min(75, item.percentile + 25) }],
          pillar: METRICS_CONFIG[item.metric]?.pillar || 'environmental',
        };
      });
    }

    return {
      recommendations,
      company_name: company.company_name,
      currentScores: pillarScores,
      percentiles,
      sectorStats,
      summary: `Generated 5 AI recommendations for ${company.company_name}. Top priority: ${recommendations[0]?.title}`,
    };
  }

  throw new Error(`Unknown function: ${name}`);
}

// ─── Build a keyed chart catalog from tool results (not rendered yet) ────────
function buildChartCatalog(toolName, result, catalog) {
  if (toolName === 'get_company_benchmark' && result.radarData) {
    const name = result.company?.company_name;
    const id = result.company?._id;

    catalog['pillars']      = { type: 'pillars',      data: result.pillarScores,    title: `ESG Pillar Scores — ${name}` };
    catalog['radar']        = { type: 'radar',         data: result.radarData,       title: `ESG Profile vs Sector — ${name}` };
    if (result.normalizedScores)
      catalog['treemap']    = { type: 'treemap',       data: result.normalizedScores, title: 'Metric Score Overview (Treemap)' };
    if (result.percentiles)
      catalog['waterfall']  = { type: 'waterfall',     data: result.percentiles,     title: 'Percentile Gap vs Sector Average' };

    if (result.boxplotData) {
      const env = result.boxplotData.filter((d) => d.pillar === 'environmental' && d.companyValue != null);
      const soc = result.boxplotData.filter((d) => d.pillar === 'social'        && d.companyValue != null);
      const gov = result.boxplotData.filter((d) => d.pillar === 'governance'    && d.companyValue != null);
      if (env.length) catalog['boxplots_env'] = { type: 'boxplots', data: env, title: 'Environmental — Distribution vs Peers' };
      if (soc.length) catalog['boxplots_soc'] = { type: 'boxplots', data: soc, title: 'Social — Distribution vs Peers' };
      if (gov.length) catalog['boxplots_gov'] = { type: 'boxplots', data: gov, title: 'Governance — Distribution vs Peers' };
    }
    if (result.genderComposition)
      catalog['donut_gender'] = { type: 'donut', data: result.genderComposition,  colors: ['#bc8cff','#58a6ff'], title: 'Gender Composition' };
    if (result.boardComposition)
      catalog['donut_board']  = { type: 'donut', data: result.boardComposition,   colors: ['#3fb950','#484f58'], title: 'Board Gender Composition' };
    if (result.boardIndComposition)
      catalog['donut_indir']  = { type: 'donut', data: result.boardIndComposition, colors: ['#58a6ff','#484f58'], title: 'Board Independence' };
    if (result.netZeroRanked?.length)
      catalog['netzero']      = { type: 'netzero', data: result.netZeroRanked, selectedId: id, title: 'Net Zero Target Year — All Peers' };
    if (result.heatmapData)
      catalog['heatmap']      = { type: 'heatmap', data: result.heatmapData, metrics: result.heatmapMetrics, selectedId: id, title: 'Peer Comparison Heatmap' };
  }

  if (toolName === 'generate_report') {
    catalog['report'] = { type: 'report', title: 'Full ESG Analysis Report' };
  }

  if (toolName === 'get_peer_comparison' && result.companies) {
    const { companies, selectedName } = result;
    catalog['peer_bars']      = { type: 'peer_bars',      data: companies, selectedName, title: 'Peer Score Distribution' };
    catalog['gap_leader']     = { type: 'gap_leader',     data: companies, selectedName, title: 'Gap to Sector Leader' };
    catalog['env_scatter']    = { type: 'env_scatter',    data: companies, selectedName, title: 'Environmental vs Social Positioning' };
    catalog['pillar_stacked'] = { type: 'pillar_stacked', data: companies, selectedName, title: 'Pillar Breakdown — Top 8 Companies' };
  }

  if (toolName === 'get_recommendations' && result.recommendations) {
    catalog['recommendations'] = {
      type: 'recommendations',
      data: result.recommendations,
      currentScores: result.currentScores,
      percentiles: result.percentiles,
      sectorStats: result.sectorStats,
      companyName: result.company_name,
      title: `AI Recommendations — ${result.company_name}`,
    };
  }

  if (toolName === 'get_metric_ranking' && result.ranked) {
    catalog['percentilebar'] = { type: 'percentilebar', data: result.ranked, label: result.label, unit: result.unit, title: `${result.label} — Percentile Rankings` };
    if (result.metric === 'net_zero_target_year') {
      const nzData = result.ranked.map((r) => ({ _id: r.id, company_name: r.company_name, value: r.value }));
      catalog['netzero'] = { type: 'netzero', data: nzData, selectedId: null, title: 'Net Zero Target Year Timeline' };
    }
  }
}

// ─── Chat endpoint (SSE streaming) ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, companyId, history = [] } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    if (!process.env.GEMINI_API_KEY) {
      send({ type: 'error', message: 'GEMINI_API_KEY not configured. Add it to backend/.env' });
      return res.end();
    }

    const systemInstruction = `You are an ESG Benchmarking & Intelligence Agent for the oil & gas sector. You analyze Environmental, Social, and Governance performance data.

Available ESG metrics:
- Environmental: Scope 1/2 emissions, emissions intensity, renewable energy %, water consumption, total waste
- Social: Gender diversity %, board women %, LTIFR (safety), employee turnover %, pay equity ratio
- Governance: Independent directors %, data breaches, net zero target year

Instructions:
1. Always use the provided functions to fetch real data before answering
2. Provide specific numbers with percentile rankings
3. Be concise but insightful — focus on actionable intelligence
4. For improvement questions, prioritize metrics where the company is in the bottom 25th percentile
5. IMPORTANT: After fetching data, always call suggest_charts with ONLY 1-2 chart keys. Be strict — one chart per concept:
   - "emissions" / "scope" / "renewable" / "environmental score" → ["boxplots_env"]
   - "social" / "turnover" / "LTIFR" / "pay equity" → ["boxplots_soc"]
   - "governance" / "directors" / "board" → ["boxplots_gov"]
   - "ESG profile" / "radar" / "how do we compare" → ["radar"]
   - "overall score" / "pillar scores" → ["pillars"]
   - "strengths" / "weaknesses" / "gap" / "improve overall" → ["waterfall"]
   - "net zero" / "climate target" → ["netzero"]
   - "peer comparison" / "heatmap" → ["heatmap"]
   - "ranking for X metric" → ["percentilebar"]
   - "full analysis" / "show everything" → ["pillars", "radar", "waterfall"]
   - "recommendations" / "action plan" / "what to improve" / "improvement plan" → call get_recommendations, then ["recommendations"]
   - "peer scores" / "score distribution" / "all companies" → call get_peer_comparison, then ["peer_bars"]
   - "gap to leader" / "how far behind best" → call get_peer_comparison, then ["gap_leader"]
   - "env vs social" / "scatter" / "positioning" → call get_peer_comparison, then ["env_scatter"]
   - "pillar breakdown top 8" / "stacked comparison" → call get_peer_comparison, then ["pillar_stacked"]
   - "full report" / "generate report" / "PDF" / "complete report" / "analysis report" → call generate_report (NO other tools), then suggest_charts(["report"])${companyId ? `\n\nSelected company ID: ${companyId} — use this in get_company_benchmark for company-specific analysis.` : ''}`;

    // Convert history to Gemini format [{role, parts:[{text}]}]
    const geminiHistory = history
      .filter((m) => m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      generationConfig: { maxOutputTokens: 2048 },
    });

    const chat = model.startChat({ history: geminiHistory });

    // chartCatalog: key → chart spec, built as tools are called
    // selectedChartKeys: set by suggest_charts; null = not yet decided
    const chartCatalog = {};
    let selectedChartKeys = null;

    let currentParts = [{ text: message }];
    let iterCount = 0;
    const MAX_ITER = 10;

    while (iterCount < MAX_ITER) {
      iterCount++;

      const result = await chat.sendMessage(currentParts);
      const response = result.response;
      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts || [];
      const functionCallParts = parts.filter((p) => p.functionCall);
      const textParts = parts.filter((p) => p.text);

      // Stream text parts immediately
      for (const part of textParts) {
        if (part.text) send({ type: 'text', content: part.text });
      }

      // No function calls means final answer
      if (functionCallParts.length === 0) break;

      // Execute each function call and collect responses
      const functionResponses = [];
      for (const part of functionCallParts) {
        const { name, args } = part.functionCall;
        const callId = `${name}-${Date.now()}`;

        if (name === 'suggest_charts') {
          // No SSE event for suggest_charts — it's invisible to the user
          selectedChartKeys = args.chart_keys || [];
          functionResponses.push({
            functionResponse: { name, response: { success: true, acknowledged: selectedChartKeys } },
          });
          continue;
        }

        send({ type: 'tool_call', tool: name, input: args, callId });

        try {
          const toolResult = await executeTool(name, args);
          send({ type: 'tool_result', tool: name, callId, summary: toolResult.summary || 'Done' });
          buildChartCatalog(name, toolResult, chartCatalog);

          functionResponses.push({
            functionResponse: {
              name,
              response: { content: JSON.stringify(toolResult) },
            },
          });
        } catch (err) {
          send({ type: 'tool_result', tool: name, callId, summary: `Error: ${err.message}` });
          functionResponses.push({
            functionResponse: {
              name,
              response: { error: err.message },
            },
          });
        }
      }

      // Feed function results back for next turn
      currentParts = functionResponses;
    }

    // Resolve final charts: use Gemini's selection if provided, else nothing
    let finalCharts = [];
    if (selectedChartKeys && selectedChartKeys.length > 0) {
      finalCharts = selectedChartKeys
        .map((key) => chartCatalog[key])
        .filter(Boolean);
    }
    // If Gemini never called suggest_charts but did fetch data, show minimal default
    else if (Object.keys(chartCatalog).length > 0) {
      const defaults = ['pillars', 'radar', 'waterfall', 'percentilebar'].filter((k) => chartCatalog[k]);
      finalCharts = defaults.map((k) => chartCatalog[k]);
    }

    send({ type: 'done', charts: finalCharts });
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    send({ type: 'error', message: err.message || 'Internal server error' });
    res.end();
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`ESG Agent backend running on port ${PORT}`));
