import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

const METRICS_LABELS = {
  scope_1: 'Scope 1', scope_2: 'Scope 2', emissions_intensity: 'Emissions Int.',
  renewable_energy_pct: 'Renewable %', water_consumption: 'Water', total_waste: 'Waste',
  gender_diversity_pct: 'Gender Div.', board_women_percent: 'Board Women',
  ltifr: 'LTIFR', employee_turnover_rate: 'Turnover', pay_equity_ratio: 'Pay Equity',
  independent_directors_percent: 'Indep. Dir.', data_breaches: 'Breaches',
  net_zero_target_year: 'Net Zero Yr',
};

function scoreToColor(score) {
  if (score >= 80) return '#1a4731';
  if (score >= 60) return '#1c3a4a';
  if (score >= 40) return '#3a2c14';
  if (score >= 20) return '#3a1c14';
  return '#2d1414';
}

function scoreToTextColor(score) {
  if (score >= 80) return '#3fb950';
  if (score >= 60) return '#39d0d8';
  if (score >= 40) return '#d29922';
  if (score >= 20) return '#f0883e';
  return '#f85149';
}

function CustomContent({ x, y, width, height, name, score }) {
  if (width < 28 || height < 22) return null;
  const textColor = scoreToTextColor(score);
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={scoreToColor(score)} rx={5} stroke="#161b22" strokeWidth={2} />
      {width > 48 && height > 34 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#8b949e" fontSize={9} fontWeight="500">
            {name?.length > 12 ? name.slice(0, 12) + '…' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" fill={textColor} fontSize={13} fontWeight="700">
            {Math.round(score)}
          </text>
        </>
      )}
      {(width <= 48 || height <= 34) && width > 28 && height > 22 && (
        <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill={textColor} fontSize={11} fontWeight="700">
          {Math.round(score)}
        </text>
      )}
    </g>
  );
}

export default function MetricTreemap({ data }) {
  if (!data || Object.keys(data).length === 0) return null;

  const treeData = Object.entries(data)
    .filter(([, v]) => v != null)
    .map(([key, score]) => ({
      name: METRICS_LABELS[key] || key,
      size: Math.max(score, 3),
      score: Math.round(score),
    }));

  if (treeData.length === 0) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <Treemap data={treeData} dataKey="size" stroke="none" content={<CustomContent />}>
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.name}</p>
                  <p style={{ color: '#8b949e' }}>Score: <span style={{ color: scoreToTextColor(d.score), fontWeight: 700 }}>{d.score}/100</span></p>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex gap-3 mt-2 justify-center flex-wrap text-xs text-gray-500">
        {[['#1a4731','#3fb950','80-100'],['#1c3a4a','#39d0d8','60-79'],['#3a2c14','#d29922','40-59'],['#3a1c14','#f0883e','20-39'],['#2d1414','#f85149','0-19']].map(([bg, text, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: bg, border: `1px solid ${text}30` }} />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
