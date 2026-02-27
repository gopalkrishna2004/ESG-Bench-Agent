import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

function barColor(percentile) {
  if (percentile >= 75) return '#3fb950';
  if (percentile >= 50) return '#58a6ff';
  if (percentile >= 25) return '#d29922';
  return '#f85149';
}

function fmt(v, unit) {
  if (v == null) return '—';
  if (unit === '%') return `${v.toFixed(1)}%`;
  if (unit === 'ratio') return v.toFixed(2);
  if (unit === 'year') return String(Math.round(v));
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(2);
}

export default function PercentileBarFull({ data, label, unit, selectedId }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((r) => ({
    name: (r.company_name || '').split(' ').slice(0, 2).join(' '),
    fullName: r.company_name,
    percentile: r.percentile ?? 0,
    displayValue: fmt(r.value, unit),
    isSelected: selectedId && r._id?.toString() === selectedId?.toString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis
          dataKey="name"
          angle={-40}
          textAnchor="end"
          tick={{ fontSize: 10, fill: '#8b949e' }}
          interval={0}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#484f58' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}th`}
        />
        <ReferenceLine y={50} stroke="#30363d" strokeDasharray="4 3"
          label={{ value: 'Median', fontSize: 9, fill: '#484f58', position: 'insideTopRight' }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.fullName}</p>
                <p style={{ color: '#8b949e' }}>Value: <span style={{ color: '#e6edf3' }}>{d.displayValue}</span></p>
                <p style={{ color: '#8b949e' }}>Percentile: <span style={{ color: barColor(d.percentile), fontWeight: 700 }}>{d.percentile}th</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="percentile" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.isSelected ? '#d29922' : barColor(entry.percentile)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
