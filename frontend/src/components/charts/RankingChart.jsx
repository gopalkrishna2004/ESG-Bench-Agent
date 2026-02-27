import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer, LabelList,
} from 'recharts';

export default function RankingChart({ data, label, unit }) {
  if (!data || data.length === 0) return null;

  const top12 = data.slice(0, 12);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, top12.length * 36)}>
      <BarChart data={top12} layout="vertical" margin={{ top: 8, right: 60, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="company_name"
          width={130}
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickFormatter={(v) => v?.length > 18 ? v.slice(0, 16) + '…' : v}
        />
        <ReferenceLine x={50} stroke="#30363d" strokeDasharray="4 2" label={{ value: 'Median', fill: '#484f58', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e6edf3', fontWeight: 600 }}
          formatter={(v, n, props) => [`${props.payload.value?.toFixed(2)} ${unit || ''} (${v}/100 score)`, label]}
        />
        <Bar dataKey="normalizedScore" radius={[0, 4, 4, 0]}>
          {top12.map((entry, i) => (
            <Cell key={i} fill={i === 0 ? '#d29922' : entry.normalizedScore >= 70 ? '#3fb950' : entry.normalizedScore >= 40 ? '#58a6ff' : '#f85149'} />
          ))}
          <LabelList dataKey="normalizedScore" position="right" style={{ fill: '#8b949e', fontSize: 10 }} formatter={(v) => `${v}`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
