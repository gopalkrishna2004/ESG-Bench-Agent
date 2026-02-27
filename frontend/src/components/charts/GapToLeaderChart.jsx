import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LabelList, ResponsiveContainer,
} from 'recharts';

const COLS = [
  { key: 'esg_score',         label: 'ESG Score' },
  { key: 'environment_score', label: 'Environmental' },
  { key: 'social_score',      label: 'Social' },
  { key: 'governance_score',  label: 'Governance' },
];

function avg(arr) {
  const valid = arr.filter((v) => v != null);
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#c9d1d9' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.metric}</p>
      <p style={{ color: '#f85149' }}>Gap to leader: −{d.gap} pts</p>
      <p style={{ color: '#6e7681' }}>Leader: {d.leader}</p>
    </div>
  );
}

export default function GapToLeaderChart({ data: companies, selectedName }) {
  if (!companies || companies.length === 0) return null;

  const selected = selectedName
    ? companies.find((c) => c.company_name === selectedName)
    : null;

  const data = COLS.map(({ key, label }) => {
    const best = Math.max(...companies.map((c) => c[key] ?? 0));
    const leaderCompany = companies.find((c) => c[key] === best);
    const myScore = selected ? (selected[key] ?? 0) : avg(companies.map((c) => c[key])) ?? 0;
    const gap = parseFloat((best - myScore).toFixed(1));
    return {
      metric: label,
      gap,
      leader: leaderCompany?.company_name.split(' ').slice(0, 2).join(' ') || '',
    };
  });

  return (
    <div>
      {selectedName && (
        <p className="text-xs text-gray-500 mb-3">
          Points behind the sector leader in each pillar · green = leading
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 50]}
            tick={{ fontSize: 10, fill: '#6e7681' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `-${v}`}
          />
          <YAxis
            type="category"
            dataKey="metric"
            tick={{ fontSize: 11, fill: '#8b949e' }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="gap" radius={[0, 4, 4, 0]} maxBarSize={32}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.gap === 0 ? '#3fb950' : entry.gap < 10 ? '#d29922' : '#f85149'}
              />
            ))}
            <LabelList
              dataKey="gap"
              position="right"
              formatter={(v) => (v === 0 ? '✓ Leader' : `-${v}`)}
              style={{ fontSize: 10, fill: '#8b949e' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
