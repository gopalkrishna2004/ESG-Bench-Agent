import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer, LabelList,
} from 'recharts';

const METRIC_LABELS = {
  scope_1: 'Scope 1', scope_2: 'Scope 2', emissions_intensity: 'Emis. Intensity',
  renewable_energy_pct: 'Renewable %', water_consumption: 'Water', total_waste: 'Total Waste',
  gender_diversity_pct: 'Gender Div.', board_women_percent: 'Board Women',
  ltifr: 'LTIFR', employee_turnover_rate: 'Turnover', pay_equity_ratio: 'Pay Equity',
  independent_directors_percent: 'Indep. Directors', data_breaches: 'Data Breaches',
  net_zero_target_year: 'Net Zero Year',
};

/**
 * Horizontal bar chart showing percentile gap vs sector average (50th percentile).
 * Data: { metric_key: percentile_value (0-100) }
 * Gap = percentile - 50 → positive = above average, negative = below average
 */
export default function GapChart({ data }) {
  if (!data || Object.keys(data).length === 0) return null;

  const items = Object.entries(data)
    .filter(([, pct]) => pct != null)
    .map(([metric, pct]) => ({
      name: METRIC_LABELS[metric] || metric,
      gap: Math.round(pct - 50),
      percentile: Math.round(pct),
    }))
    .sort((a, b) => b.gap - a.gap);

  if (items.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 32 + 50, 200)}>
      <BarChart data={items} layout="vertical" margin={{ top: 8, right: 55, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis
          type="number"
          domain={[-55, 55]}
          tick={{ fill: '#484f58', fontSize: 10 }}
          tickLine={false}
          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={118}
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine x={0} stroke="#484f58" strokeWidth={1.5}
          label={{ value: 'Sector Avg', fill: '#484f58', fontSize: 9, position: 'insideTopRight' }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.name}</p>
                <p style={{ color: '#8b949e' }}>Percentile: <span style={{ color: '#e6edf3', fontWeight: 600 }}>{d.percentile}th</span></p>
                <p style={{ color: d.gap >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                  vs Avg: {d.gap >= 0 ? '+' : ''}{d.gap} pts
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="gap" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList
            dataKey="gap"
            position="right"
            style={{ fontSize: 10, fill: '#8b949e' }}
            formatter={(v) => `${v > 0 ? '+' : ''}${v}`}
          />
          {items.map((entry, i) => (
            <Cell key={i} fill={entry.gap >= 0 ? '#3fb950' : '#f85149'} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
