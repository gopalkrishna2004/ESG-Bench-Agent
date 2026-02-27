import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function PillarStackedChart({ data: companies, selectedName }) {
  if (!companies || companies.length === 0) return null;

  const top8 = [...companies]
    .filter((c) => c.esg_score != null)
    .sort((a, b) => b.esg_score - a.esg_score)
    .slice(0, 8);

  const data = top8.map((c) => ({
    name: c.company_name.split(' ').slice(0, 2).join(' '),
    Environmental: c.environment_score ?? 0,
    Social:        c.social_score ?? 0,
    Governance:    c.governance_score ?? 0,
    isSelected:    c.company_name === selectedName,
  }));

  const renderCustomTick = (props) => {
    const { x, y, payload } = props;
    const item = data.find((d) => d.name === payload.value);
    return (
      <text
        x={x} y={y} dy={4}
        textAnchor="end"
        fontSize={10}
        fill={item?.isSelected ? '#58a6ff' : '#6e7681'}
        fontWeight={item?.isSelected ? 700 : 400}
      >
        {item?.isSelected ? `★ ${payload.value}` : payload.value}
      </text>
    );
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Stacked E + S + G scores for top-8 companies by ESG score
        {selectedName && <> · <span className="text-[#58a6ff] font-medium">★ = {selectedName}</span></>}
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
          <XAxis type="number" domain={[0, 240]} tick={{ fontSize: 9, fill: '#6e7681' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={renderCustomTick} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v, name) => [`${v}/100`, name]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #30363d', background: '#161b22', color: '#c9d1d9' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#8b949e' }} />
          <Bar dataKey="Environmental" stackId="a" fill="#3fb950" maxBarSize={18} />
          <Bar dataKey="Social"        stackId="a" fill="#58a6ff" maxBarSize={18} />
          <Bar dataKey="Governance"    stackId="a" fill="#bc8cff" maxBarSize={18} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
