import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer, LabelList,
} from 'recharts';

const METRICS_LABELS = {
  scope_1: 'Scope 1', scope_2: 'Scope 2', emissions_intensity: 'Emis. Int.',
  renewable_energy_pct: 'Renewable', water_consumption: 'Water', total_waste: 'Waste',
  gender_diversity_pct: 'Gender', board_women_percent: 'Bd Women',
  ltifr: 'LTIFR', employee_turnover_rate: 'Turnover', pay_equity_ratio: 'Pay Eq.',
  independent_directors_percent: 'Indep. Dir.', data_breaches: 'Breaches',
  net_zero_target_year: 'Net Zero',
};

export default function PercentileWaterfall({ data }) {
  if (!data || Object.keys(data).length === 0) return null;

  const chartData = Object.entries(data)
    .filter(([, pct]) => pct != null)
    .map(([metric, pct]) => ({
      label: METRICS_LABELS[metric] || metric,
      fullLabel: metric,
      pct,
      gap: pct - 50,
    }))
    .sort((a, b) => a.gap - b.gap);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 65 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis
          dataKey="label"
          angle={-42}
          textAnchor="end"
          tick={{ fontSize: 10, fill: '#8b949e' }}
          interval={0}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#484f58' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
          domain={[-60, 60]}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.label}</p>
                <p style={{ color: '#8b949e' }}>Percentile: <span style={{ color: '#e6edf3', fontWeight: 600 }}>{d.pct}th</span></p>
                <p style={{ color: d.gap >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                  vs Avg: {d.gap >= 0 ? '+' : ''}{d.gap} pts
                </p>
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke="#484f58" strokeWidth={1.5}
          label={{ value: 'Sector Average', fontSize: 9, fill: '#484f58', position: 'insideTopRight' }} />
        <Bar dataKey="gap" radius={[3, 3, 0, 0]} maxBarSize={32}>
          <LabelList
            dataKey="gap"
            position="top"
            style={{ fontSize: 9, fill: '#8b949e' }}
            formatter={(v) => `${v > 0 ? '+' : ''}${v}`}
          />
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.gap >= 0 ? '#3fb950' : '#f85149'} opacity={0.85} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
