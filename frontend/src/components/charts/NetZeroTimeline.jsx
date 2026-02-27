import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';

function yearColor(year) {
  if (year <= 2035) return '#3fb950';
  if (year <= 2045) return '#d29922';
  return '#f85149';
}

export default function NetZeroTimeline({ data, selectedId }) {
  if (!data || data.length === 0) return null;

  const chartData = data
    .filter((r) => r.value != null && r.value > 2020)
    .map((r) => ({
      name: (r.company_name || '').split(' ').slice(0, 3).join(' '),
      fullName: r.company_name,
      year: Math.round(r.value),
      isSelected: selectedId && (r._id?.toString() === selectedId?.toString()),
    }))
    .sort((a, b) => a.year - b.year);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(chartData.length * 30 + 50, 200)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 36, left: 10, bottom: 8 }}>
        <XAxis
          type="number"
          domain={[2025, (max) => Math.max(max + 2, 2055)]}
          tick={{ fontSize: 10, fill: '#484f58' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={({ x, y, payload }) => {
            const item = chartData.find((d) => d.name === payload.value);
            return (
              <text x={x} y={y} dy={4} textAnchor="end" fontSize={10}
                fill={item?.isSelected ? '#58a6ff' : '#8b949e'}
                fontWeight={item?.isSelected ? 700 : 400}
              >
                {item?.isSelected ? `★ ${payload.value}` : payload.value}
              </text>
            );
          }}
        />
        <ReferenceLine x={2035} stroke="#3fb950" strokeDasharray="4 3" strokeWidth={1}
          label={{ value: '2035', position: 'top', fontSize: 9, fill: '#3fb950' }} />
        <ReferenceLine x={2045} stroke="#d29922" strokeDasharray="4 3" strokeWidth={1}
          label={{ value: '2045', position: 'top', fontSize: 9, fill: '#d29922' }} />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.fullName}</p>
                <p style={{ color: '#8b949e' }}>Target: <span style={{ color: yearColor(d.year), fontWeight: 700 }}>{d.year}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="year" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.isSelected ? '#d29922' : yearColor(d.year)} opacity={d.isSelected ? 1 : 0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
