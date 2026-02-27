import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

const COLS = [
  { key: 'esg_score',         label: 'ESG Score' },
  { key: 'environment_score', label: 'Environmental' },
  { key: 'social_score',      label: 'Social' },
  { key: 'governance_score',  label: 'Governance' },
];

function SinglePeerBar({ companies, selectedName, scoreKey, label }) {
  const sorted = [...companies]
    .filter((c) => c[scoreKey] != null)
    .sort((a, b) => b[scoreKey] - a[scoreKey]);

  const data = sorted.map((c) => ({
    name: c.company_name.split(' ').slice(0, 2).join(' '),
    score: c[scoreKey],
    isSelected: c.company_name === selectedName,
  }));

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: '#6e7681' }}
            tickLine={false}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6e7681' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => [`${v}/100`, label]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #30363d', background: '#161b22', color: '#c9d1d9' }}
          />
          <ReferenceLine y={50} stroke="#30363d" strokeDasharray="4 3" />
          <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isSelected ? '#58a6ff' : '#484f58'}
                opacity={entry.isSelected ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PeerBarChart({ data: companies, selectedName }) {
  if (!companies || companies.length === 0) return null;
  return (
    <div>
      {selectedName && (
        <p className="text-xs text-gray-500 mb-3">
          <span className="inline-block w-2.5 h-2.5 rounded bg-[#58a6ff] mr-1 align-middle" />
          {selectedName} highlighted · sorted by score
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {COLS.map((col) => (
          <SinglePeerBar
            key={col.key}
            companies={companies}
            selectedName={selectedName}
            scoreKey={col.key}
            label={col.label}
          />
        ))}
      </div>
    </div>
  );
}
