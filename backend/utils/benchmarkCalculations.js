/** Metric definitions: label, unit, pillar, and whether lower values are better */
const METRICS_CONFIG = {
  scope_1: { label: 'Scope 1 Emissions', unit: 'tCO₂e', lowerIsBetter: true, pillar: 'environmental' },
  scope_2: { label: 'Scope 2 Emissions', unit: 'tCO₂e', lowerIsBetter: true, pillar: 'environmental' },
  emissions_intensity: { label: 'Emissions Intensity', unit: 'tCO₂e/unit', lowerIsBetter: true, pillar: 'environmental' },
  renewable_energy_pct: { label: 'Renewable Energy %', unit: '%', lowerIsBetter: false, pillar: 'environmental' },
  water_consumption: { label: 'Water Consumption', unit: 'KL', lowerIsBetter: true, pillar: 'environmental' },
  total_waste: { label: 'Total Waste', unit: 'MT', lowerIsBetter: true, pillar: 'environmental' },
  gender_diversity_pct: { label: 'Gender Diversity', unit: '%', lowerIsBetter: false, pillar: 'social' },
  board_women_percent: { label: 'Board Women %', unit: '%', lowerIsBetter: false, pillar: 'social' },
  ltifr: { label: 'LTIFR', unit: 'rate', lowerIsBetter: true, pillar: 'social' },
  employee_turnover_rate: { label: 'Employee Turnover', unit: '%', lowerIsBetter: true, pillar: 'social' },
  pay_equity_ratio: { label: 'Pay Equity Ratio', unit: 'ratio', lowerIsBetter: false, pillar: 'social' },
  independent_directors_percent: { label: 'Independent Directors', unit: '%', lowerIsBetter: false, pillar: 'governance' },
  data_breaches: { label: 'Data Breaches', unit: 'count', lowerIsBetter: true, pillar: 'governance' },
  net_zero_target_year: { label: 'Net Zero Target Year', unit: 'year', lowerIsBetter: true, pillar: 'governance' },
};

function toPlain(doc) {
  if (doc == null) return {};
  if (typeof doc.toObject === 'function') return doc.toObject();
  if (typeof doc.toJSON === 'function') return doc.toJSON();
  return { ...doc };
}

function computeDerivedMetrics(company) {
  const plain = toPlain(company);
  const d = { ...plain };
  if (plain.renewable_energy != null && plain.energy_consumption != null && plain.energy_consumption > 0) {
    d.renewable_energy_pct = (plain.renewable_energy / plain.energy_consumption) * 100;
  }
  if (plain.female_employees != null && plain.employees != null && plain.employees > 0) {
    d.gender_diversity_pct = (plain.female_employees / plain.employees) * 100;
  }
  if (plain.median_remuneration_female != null && plain.median_remuneration_male != null && plain.median_remuneration_male > 0) {
    d.pay_equity_ratio = plain.median_remuneration_female / plain.median_remuneration_male;
  }
  return d;
}

function computeSectorStats(companies) {
  const enriched = companies.map(computeDerivedMetrics);
  const stats = {};

  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const values = enriched.map((c) => c[metric]).filter((v) => v != null && !isNaN(v));
    if (values.length === 0) {
      stats[metric] = { min: null, max: null, avg: null, p25: null, p50: null, p75: null, best: null, worst: null, count: 0 };
      return;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const avg = values.reduce((a, b) => a + b, 0) / n;
    stats[metric] = {
      min: sorted[0],
      max: sorted[n - 1],
      avg,
      p25: sorted[Math.floor(n * 0.25)],
      p50: sorted[Math.floor(n * 0.5)],
      p75: sorted[Math.floor(n * 0.75)],
      best: config.lowerIsBetter ? sorted[0] : sorted[n - 1],
      worst: config.lowerIsBetter ? sorted[n - 1] : sorted[0],
      count: n,
    };
  });

  return { enriched, stats };
}

function computePercentileRank(value, allValues, lowerIsBetter) {
  if (value == null || isNaN(value)) return null;
  const valid = allValues.filter((v) => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  const betterThan = lowerIsBetter ? valid.filter((v) => v > value).length : valid.filter((v) => v < value).length;
  return Math.round((betterThan / valid.length) * 100);
}

function computeNormalizedScore(value, min, max, lowerIsBetter) {
  if (value == null || min == null || max == null || max === min) return null;
  const raw = lowerIsBetter ? (max - value) / (max - min) : (value - min) / (max - min);
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

function computePillarScores(companyMetrics, stats) {
  const buckets = { environmental: [], social: [], governance: [] };
  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const value = companyMetrics[metric];
    const ms = stats[metric];
    if (value == null || !ms || ms.min == null) return;
    const score = computeNormalizedScore(value, ms.min, ms.max, config.lowerIsBetter);
    if (score != null) buckets[config.pillar].push(score);
  });
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  return {
    environmental: avg(buckets.environmental),
    social: avg(buckets.social),
    governance: avg(buckets.governance),
  };
}

function computeGapAnalysis(companyMetrics, enrichedPeers, stats) {
  const gaps = {};
  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const value = companyMetrics[metric];
    const ms = stats[metric];
    if (value == null || !ms || ms.best == null) { gaps[metric] = null; return; }
    const leaderName = enrichedPeers.find((c) => c[metric] === ms.best)?.company_name || 'Leader';
    gaps[metric] = {
      companyValue: value,
      leaderValue: ms.best,
      avgValue: ms.avg,
      gapToLeader: config.lowerIsBetter ? value - ms.best : ms.best - value,
      gapToAvg: config.lowerIsBetter ? value - ms.avg : ms.avg - value,
      leaderName,
      unit: config.unit,
      label: config.label,
      lowerIsBetter: config.lowerIsBetter,
    };
  });
  return gaps;
}

const RADAR_METRICS = [
  'emissions_intensity', 'renewable_energy_pct', 'water_consumption',
  'gender_diversity_pct', 'board_women_percent', 'ltifr',
  'independent_directors_percent', 'pay_equity_ratio',
];

function computeRadarData(companyMetrics, enrichedPeers, stats) {
  return RADAR_METRICS.map((metric) => {
    const config = METRICS_CONFIG[metric];
    if (!config) return null;
    const ms = stats[metric];
    if (!ms || ms.min == null) return null;
    const allVals = enrichedPeers.map((c) => c[metric]).filter((v) => v != null && !isNaN(v));
    const avgVal = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
    return {
      metric: config.label,
      company: computeNormalizedScore(companyMetrics[metric], ms.min, ms.max, config.lowerIsBetter) ?? 0,
      sectorAvg: computeNormalizedScore(avgVal, ms.min, ms.max, config.lowerIsBetter) ?? 0,
      leader: 100,
    };
  }).filter(Boolean);
}

function computeStrengthsWeaknesses(percentiles) {
  const strengths = [], weaknesses = [], opportunities = [];
  Object.entries(percentiles).forEach(([metric, pct]) => {
    if (pct == null) return;
    const config = METRICS_CONFIG[metric];
    if (!config) return;
    if (pct >= 75) strengths.push({ metric, label: config.label, percentile: pct });
    else if (pct <= 25) weaknesses.push({ metric, label: config.label, percentile: pct });
    else if (pct > 25 && pct <= 50) opportunities.push({ metric, label: config.label, percentile: pct });
  });
  return {
    strengths: strengths.sort((a, b) => b.percentile - a.percentile),
    weaknesses: weaknesses.sort((a, b) => a.percentile - b.percentile),
    opportunities: opportunities.sort((a, b) => a.percentile - b.percentile),
  };
}

module.exports = {
  METRICS_CONFIG, RADAR_METRICS, toPlain,
  computeDerivedMetrics, computeSectorStats, computePercentileRank,
  computeNormalizedScore, computePillarScores, computeGapAnalysis,
  computeRadarData, computeStrengthsWeaknesses,
};
