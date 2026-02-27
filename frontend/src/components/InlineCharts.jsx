import { useState } from 'react';
import ESGRadarChart from './charts/RadarChart';
import PillarScores from './charts/PillarScores';
import RankingChart from './charts/RankingChart';
import HeatmapChart from './charts/HeatmapChart';
import MetricTreemap from './charts/MetricTreemap';
import BoxPlotGrid from './charts/BoxPlotGrid';
import NetZeroTimeline from './charts/NetZeroTimeline';
import CompositionDonut from './charts/CompositionDonut';
import PercentileWaterfall from './charts/PercentileWaterfall';
import PercentileBarFull from './charts/PercentileBarFull';
import PeerBarChart from './charts/PeerBarChart';
import GapToLeaderChart from './charts/GapToLeaderChart';
import EnvSocialScatter from './charts/EnvSocialScatter';
import PillarStackedChart from './charts/PillarStackedChart';

const HEATMAP_LEGEND = [
  ['#1a4731', '80–100'], ['#1c3a4a', '60–79'], ['#3a2c14', '40–59'],
  ['#3a1c14', '20–39'], ['#2d1414', '0–19'],
];

function ChartCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="chart-card mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left mb-1 group"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">
          {title}
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function InlineCharts({ charts }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {charts.map((chart, i) => {
        switch (chart.type) {

          case 'pillars':
            return (
              <ChartCard key={i} title={chart.title || 'ESG Pillar Scores'}>
                <PillarScores data={chart.data} />
              </ChartCard>
            );

          case 'radar':
            return (
              <ChartCard key={i} title={chart.title || 'ESG Profile vs Sector'}>
                <ESGRadarChart data={chart.data} />
                <div className="flex gap-4 mt-1 justify-center text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-green inline-block rounded" />Company</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-orange inline-block rounded" />Sector Avg</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-blue inline-block rounded" />Leader</span>
                </div>
              </ChartCard>
            );

          case 'treemap':
            return (
              <ChartCard key={i} title={chart.title || 'Metric Score Overview'}>
                <MetricTreemap data={chart.data} />
              </ChartCard>
            );

          case 'waterfall':
            return (
              <ChartCard key={i} title={chart.title || 'Percentile Gap vs Sector Average'}>
                <PercentileWaterfall data={chart.data} />
                <p className="text-xs text-gray-600 text-center mt-1">
                  Green = above sector avg (50th %ile) · Red = below
                </p>
              </ChartCard>
            );

          case 'boxplots':
            return (
              <ChartCard key={i} title={chart.title || 'Distribution vs Peers'}>
                <BoxPlotGrid data={chart.data} />
              </ChartCard>
            );

          case 'donut':
            return (
              <ChartCard key={i} title={chart.title || 'Composition'}>
                <div className="flex justify-center py-2">
                  <CompositionDonut data={chart.data} colors={chart.colors} />
                </div>
              </ChartCard>
            );

          case 'netzero':
            return (
              <ChartCard key={i} title={chart.title || 'Net Zero Target Year'}>
                <NetZeroTimeline data={chart.data} selectedId={chart.selectedId} />
                <div className="flex gap-4 mt-1 justify-center text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#3fb950]" />≤ 2035</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#d29922]" />2036–2045</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#f85149]" />&gt; 2045</span>
                </div>
              </ChartCard>
            );

          case 'ranking':
            return (
              <ChartCard key={i} title={chart.title || `${chart.label} — Sector Ranking`}>
                <RankingChart data={chart.data} label={chart.label} unit={chart.unit} />
              </ChartCard>
            );

          case 'percentilebar':
            return (
              <ChartCard key={i} title={chart.title || `${chart.label} — Percentile Rankings`}>
                <PercentileBarFull data={chart.data} label={chart.label} unit={chart.unit} selectedId={chart.selectedId} />
                <div className="flex gap-3 mt-1 justify-center text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#3fb950]" />Top 25%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#58a6ff]" />50–75th</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#d29922]" />25–50th</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#f85149]" />Bottom 25%</span>
                </div>
              </ChartCard>
            );

          case 'heatmap':
            return (
              <ChartCard key={i} title={chart.title || 'Peer Comparison Heatmap'}>
                <HeatmapChart data={chart.data} metrics={chart.metrics} selectedId={chart.selectedId} />
                <div className="flex gap-3 mt-3 text-xs text-gray-500 flex-wrap">
                  {HEATMAP_LEGEND.map(([bg, label]) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded inline-block" style={{ background: bg }} />{label}
                    </span>
                  ))}
                </div>
              </ChartCard>
            );

          case 'peer_bars':
            return (
              <ChartCard key={i} title={chart.title || 'Peer Score Distribution'}>
                <PeerBarChart data={chart.data} selectedName={chart.selectedName} />
              </ChartCard>
            );

          case 'gap_leader':
            return (
              <ChartCard key={i} title={chart.title || 'Gap to Sector Leader'}>
                <GapToLeaderChart data={chart.data} selectedName={chart.selectedName} />
                <div className="flex gap-4 mt-1 justify-center text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#3fb950]" />Leading</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#d29922]" />&lt;10 pts gap</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-[#f85149]" />≥10 pts gap</span>
                </div>
              </ChartCard>
            );

          case 'env_scatter':
            return (
              <ChartCard key={i} title={chart.title || 'Environmental vs Social Positioning'}>
                <EnvSocialScatter data={chart.data} selectedName={chart.selectedName} />
              </ChartCard>
            );

          case 'pillar_stacked':
            return (
              <ChartCard key={i} title={chart.title || 'Pillar Breakdown — Top 8 Companies'}>
                <PillarStackedChart data={chart.data} selectedName={chart.selectedName} />
              </ChartCard>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
