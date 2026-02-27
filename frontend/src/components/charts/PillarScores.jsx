import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PILLARS = [
  { key: 'environmental', label: 'Environmental', color: '#3fb950', bg: '#3fb95020' },
  { key: 'social', label: 'Social', color: '#58a6ff', bg: '#58a6ff20' },
  { key: 'governance', label: 'Governance', color: '#bc8cff', bg: '#bc8cff20' },
];

function DonutGauge({ score, color, bg, label }) {
  const safe = score ?? 0;
  const data = [{ value: safe }, { value: 100 - safe }];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              <Cell fill={color} />
              <Cell fill="#21262d" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score ?? '—'}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}

export default function PillarScores({ data }) {
  if (!data) return null;
  return (
    <div className="flex justify-around gap-4 py-2">
      {PILLARS.map(({ key, label, color, bg }) => (
        <DonutGauge key={key} score={data[key]} color={color} bg={bg} label={label} />
      ))}
      {data.overall != null && (
        <DonutGauge score={data.overall} color="#e6edf3" bg="#e6edf320" label="Overall" />
      )}
    </div>
  );
}
