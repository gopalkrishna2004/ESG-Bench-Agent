import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer, Tooltip,
} from 'recharts';

export default function ESGRadarChart({ data }) {
  if (!data || data.length === 0) return null;

  // Shorten long labels
  const shortened = data.map((d) => ({
    ...d,
    metric: d.metric.length > 16 ? d.metric.slice(0, 14) + '…' : d.metric,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={shortened} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#30363d" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: '#8b949e', fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 9 }} tickCount={4} />
        <Radar name="Company" dataKey="company" stroke="#3fb950" fill="#3fb950" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: '#3fb950' }} />
        <Radar name="Sector Avg" dataKey="sectorAvg" stroke="#d29922" fill="#d29922" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" />
        <Radar name="Leader" dataKey="leader" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.05} strokeWidth={1} strokeDasharray="2 3" />
        <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e6edf3', fontWeight: 600 }}
          itemStyle={{ color: '#8b949e' }}
          formatter={(v) => [`${v}/100`]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
