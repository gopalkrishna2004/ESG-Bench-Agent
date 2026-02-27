import { useRef, useState, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import ESGRadarChart from '../components/charts/RadarChart';
import PillarScores from '../components/charts/PillarScores';
import MetricTreemap from '../components/charts/MetricTreemap';
import PercentileWaterfall from '../components/charts/PercentileWaterfall';
import BoxPlotGrid from '../components/charts/BoxPlotGrid';
import HeatmapChart from '../components/charts/HeatmapChart';
import CompositionDonut from '../components/charts/CompositionDonut';
import NetZeroTimeline from '../components/charts/NetZeroTimeline';
import PeerBarChart from '../components/charts/PeerBarChart';
import GapToLeaderChart from '../components/charts/GapToLeaderChart';
import EnvSocialScatter from '../components/charts/EnvSocialScatter';
import PillarStackedChart from '../components/charts/PillarStackedChart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreLabel(score) {
  if (score == null) return { text: 'N/A', color: '#484f58' };
  if (score >= 70)   return { text: 'Strong',  color: '#3fb950' };
  if (score >= 50)   return { text: 'Average', color: '#d29922' };
  return               { text: 'Weak',    color: '#f85149' };
}

/**
 * Convert all SVG elements inside a container to canvas elements.
 * Returns a restore function that puts the original SVGs back.
 */
async function svgsToCanvases(container) {
  const svgs = Array.from(container.querySelectorAll('svg'));
  const records = [];

  for (const svg of svgs) {
    try {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Clone SVG and inline computed styles for accurate rendering
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', rect.width);
      clone.setAttribute('height', rect.height);

      // Inline computed styles on every element inside the SVG
      const allOriginal = svg.querySelectorAll('*');
      const allCloned = clone.querySelectorAll('*');
      for (let i = 0; i < allOriginal.length; i++) {
        const computed = window.getComputedStyle(allOriginal[i]);
        const important = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray',
          'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor',
          'dominant-baseline', 'transform', 'visibility', 'display'];
        for (const prop of important) {
          const val = computed.getPropertyValue(prop);
          if (val) allCloned[i]?.style.setProperty(prop, val);
        }
      }

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const canvas = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const scale = 2;
          c.width = rect.width * scale;
          c.height = rect.height * scale;
          c.style.width = rect.width + 'px';
          c.style.height = rect.height + 'px';
          const ctx = c.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          URL.revokeObjectURL(url);
          resolve(c);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
        img.src = url;
      });

      records.push({ svg, parent: svg.parentNode, nextSibling: svg.nextSibling, canvas });
      svg.parentNode.replaceChild(canvas, svg);
    } catch {
      // Skip SVGs that fail to convert (toolbar icons etc.)
    }
  }

  return function restore() {
    for (const { svg, parent, nextSibling, canvas } of records) {
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(svg, canvas);
      }
    }
  };
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-8">
      <div className="border-b border-surface-600 pb-2 mb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="chart-panel bg-surface-800 border border-surface-600 rounded-xl p-5 w-full">
      {title && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>}
      {children}
    </div>
  );
}

// ─── Pillar score cards ───────────────────────────────────────────────────────

function PillarCard({ label, score, icon }) {
  const { text, color } = scoreLabel(score);
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold" style={{ color }}>
          {score != null ? score.toFixed ? score.toFixed(0) : score : '—'}
        </span>
        <span className="text-sm text-gray-500 mb-0.5">/100</span>
      </div>
      <span className="text-xs font-semibold px-2 py-0.5 rounded self-start"
        style={{ background: color + '25', color }}>{text}</span>
    </div>
  );
}

// ─── Main Report ──────────────────────────────────────────────────────────────

export default function ReportPage({ company, benchmarkData, peerData, onClose }) {
  const { pillarScores, radarData, percentiles, normalizedScores,
    gapAnalysis, boxplotData, genderComposition, boardComposition,
    boardIndComposition, netZeroRanked, heatmapData, heatmapMetrics } = benchmarkData;

  const peerCompanies = peerData?.companies || [];
  const selectedName = company?.company_name || null;

  const envBoxplots = (boxplotData || []).filter((d) => d.pillar === 'environmental');
  const socBoxplots = (boxplotData || []).filter((d) => d.pillar === 'social');
  const govBoxplots = (boxplotData || []).filter((d) => d.pillar === 'governance');

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const { text: overallLabel, color: overallColor } = scoreLabel(pillarScores?.overall);

  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);

    let restore = null;
    try {
      // Step 1: Convert all SVGs to canvas so html2canvas can capture them
      restore = await svgsToCanvases(reportRef.current);

      // Step 2: Generate PDF
      const fileName = `ESG_Report_${(company?.company_name || 'Company').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      await html2pdf()
        .set({
          margin: [8, 6, 8, 6],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0d1117',
            scrollY: 0,
            windowWidth: reportRef.current.scrollWidth,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css'], avoid: ['.chart-panel', '.pillar-card'] },
        })
        .from(reportRef.current)
        .save();
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      // Step 3: Restore original SVGs so the on-screen report still works
      if (restore) restore();
      setDownloading(false);
    }
  }, [downloading, company]);

  return (
    <>
      {/* ── Full-screen overlay ── */}
      <div
        className="fixed inset-0 z-50 bg-surface-900 overflow-y-auto"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* ── Toolbar ── */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-surface-800 border-b border-surface-600 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </button>
            <span className="text-gray-600">|</span>
            <span className="text-sm font-semibold text-white">
              ESG Analysis Report — {company?.company_name}
            </span>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating PDF…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* ── Report Body ── */}
        <div ref={reportRef} className="max-w-5xl mx-auto px-6 py-8" style={{ backgroundColor: '#0d1117' }}>

          {/* ══ COVER ══════════════════════════════════════════════════════ */}
          <div className="mb-8 pb-6 border-b border-surface-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">ESG Benchmarking Report</p>
                <h1 className="text-3xl font-bold text-white mb-1">{company?.company_name}</h1>
                <p className="text-sm text-gray-500">{company?.sector} · BSE {company?.bse_code}</p>
                <p className="text-xs text-gray-600 mt-2">Generated: {today}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex flex-col items-center bg-surface-800 border border-surface-600 rounded-2xl px-8 py-5">
                  <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overall ESG</span>
                  <span className="text-5xl font-bold" style={{ color: overallColor }}>
                    {pillarScores?.overall ?? '—'}
                  </span>
                  <span className="text-sm text-gray-500">/100</span>
                  <span className="text-xs font-semibold mt-2 px-3 py-1 rounded"
                    style={{ background: overallColor + '25', color: overallColor }}>{overallLabel}</span>
                </div>
              </div>
            </div>

            {/* Score summary cards */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              <PillarCard label="ESG Score"    score={pillarScores?.overall}     icon="🌱" />
              <PillarCard label="Environmental" score={pillarScores?.environmental} icon="🌍" />
              <PillarCard label="Social"        score={pillarScores?.social}        icon="👥" />
              <PillarCard label="Governance"    score={pillarScores?.governance}    icon="🏛️" />
            </div>
          </div>

          {/* ══ SECTION 1: ESG PROFILE ═══════════════════════════════════ */}
          <Section title="ESG Profile" subtitle="Company vs sector average vs sector leader across all metrics">
            <ChartPanel title="Radar — Multi-Metric Profile">
              <ESGRadarChart data={radarData} />
            </ChartPanel>
            <div className="mt-4">
              <ChartPanel title="Pillar Score Gauges — E / S / G">
                <PillarScores data={pillarScores} />
              </ChartPanel>
            </div>
          </Section>

          {/* ══ SECTION 2: PERFORMANCE OVERVIEW ══════════════════════════ */}
          <Section title="Performance Overview" subtitle="Normalized 0–100 scores across all metrics vs sector average percentiles">
            <ChartPanel title="Metric Treemap — Normalized Scores">
              <MetricTreemap data={normalizedScores} />
            </ChartPanel>
            <div className="mt-4">
              <ChartPanel title="Percentile Gap vs Sector Average">
                <PercentileWaterfall data={percentiles} />
                <p className="text-xs text-gray-600 text-center mt-1">
                  Green = above sector average (50th %ile) · Red = below
                </p>
              </ChartPanel>
            </div>
            {heatmapData && heatmapData.length > 0 && (
              <div className="mt-4">
                <ChartPanel title="Peer Comparison Heatmap — Key Metrics (Normalized 0–100)">
                  <HeatmapChart data={heatmapData} metrics={heatmapMetrics} selectedId={company?._id} />
                  <div className="flex gap-3 mt-3 text-xs text-gray-500 flex-wrap">
                    {[['#1a4731','80–100'],['#1c3a4a','60–79'],['#3a2c14','40–59'],['#3a1c14','20–39'],['#2d1414','0–19']].map(([bg,label]) => (
                      <span key={label} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded inline-block" style={{ background: bg }} />{label}
                      </span>
                    ))}
                  </div>
                </ChartPanel>
              </div>
            )}
          </Section>

          {/* ══ SECTION 3: ENVIRONMENTAL ══════════════════════════════════ */}
          <Section title="Environmental Analysis" subtitle="Scope 1/2 emissions, renewable energy, water, waste — distribution vs sector peers">
            {envBoxplots.length > 0 && (
              <ChartPanel title="Environmental Metrics — Distribution vs Sector">
                <BoxPlotGrid data={envBoxplots} />
              </ChartPanel>
            )}
          </Section>

          {/* ══ SECTION 4: SOCIAL ═════════════════════════════════════════ */}
          <Section title="Social Analysis" subtitle="Gender diversity, safety (LTIFR), turnover, pay equity — distribution vs sector peers">
            <ChartPanel title="Social Metrics — Distribution vs Sector">
              <BoxPlotGrid data={socBoxplots} />
            </ChartPanel>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {genderComposition && (
                <ChartPanel title="Workforce Gender Composition">
                  <div className="flex justify-center py-3">
                    <CompositionDonut
                      data={genderComposition}
                      colors={['#bc8cff','#58a6ff']}
                      centerLabel={`${genderComposition[0]?.value != null && genderComposition[0]?.value + (genderComposition[1]?.value ?? 0) > 0
                        ? ((genderComposition[0].value / (genderComposition[0].value + (genderComposition[1]?.value ?? 0))) * 100).toFixed(0)
                        : '—'}%`}
                      centerSubLabel="Female"
                    />
                  </div>
                </ChartPanel>
              )}
              {boardComposition && (
                <ChartPanel title="Board Gender Composition">
                  <div className="flex justify-center py-3">
                    <CompositionDonut data={boardComposition} colors={['#3fb950','#484f58']} />
                  </div>
                </ChartPanel>
              )}
            </div>
          </Section>

          {/* ══ SECTION 5: GOVERNANCE ═════════════════════════════════════ */}
          <Section title="Governance Analysis" subtitle="Board independence, data breaches, net zero commitments — distribution vs sector peers">
            <ChartPanel title="Governance Metrics — Distribution vs Sector">
              <BoxPlotGrid data={govBoxplots} />
            </ChartPanel>
            {boardIndComposition && (
              <div className="mt-4">
                <ChartPanel title="Board Independence Composition">
                  <div className="flex justify-center py-3">
                    <CompositionDonut data={boardIndComposition} colors={['#58a6ff','#484f58']} />
                  </div>
                </ChartPanel>
              </div>
            )}
            {netZeroRanked && netZeroRanked.length > 0 && (
              <div className="mt-4">
                <ChartPanel title="Net Zero Target Year — All Sector Peers">
                  <NetZeroTimeline data={netZeroRanked} selectedId={company?._id} />
                  <div className="flex gap-4 mt-2 justify-center text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#3fb950]" />≤ 2035</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#d29922]" />2036–2045</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#f85149]" />&gt; 2045</span>
                  </div>
                </ChartPanel>
              </div>
            )}
          </Section>

          {/* ══ SECTION 6: PEER COMPARISON ════════════════════════════════ */}
          {peerCompanies.length > 0 && (
            <Section title="Peer Comparison" subtitle="External ESG ratings — all oil & gas sector companies">
              <div className="grid grid-cols-2 gap-4">
                <ChartPanel title="Gap to Sector Leader — By Pillar">
                  <GapToLeaderChart data={peerCompanies} selectedName={selectedName} />
                  <div className="flex gap-3 mt-2 justify-center text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#3fb950]" />Leading</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#d29922]" />&lt;10 pts</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#f85149]" />≥10 pts</span>
                  </div>
                </ChartPanel>
                <ChartPanel title="Environmental vs Social Positioning">
                  <EnvSocialScatter data={peerCompanies} selectedName={selectedName} />
                </ChartPanel>
              </div>
              <div className="mt-4">
                <ChartPanel title="Pillar Breakdown — Top 8 Companies">
                  <PillarStackedChart data={peerCompanies} selectedName={selectedName} />
                </ChartPanel>
              </div>
              <div className="mt-4">
                <ChartPanel title="Peer Score Distribution">
                  <PeerBarChart data={peerCompanies} selectedName={selectedName} />
                </ChartPanel>
              </div>
            </Section>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-surface-600 mt-6 pt-4 flex items-center justify-between text-xs text-gray-600">
            <span>ESG Benchmarking &amp; Intelligence Agent · Oil &amp; Gas Sector</span>
            <span>Generated {today}</span>
          </div>
        </div>
      </div>
    </>
  );
}
