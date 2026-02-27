import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_COLORS = ['#bc8cff', '#58a6ff'];

export default function CompositionDonut({ data, colors = DEFAULT_COLORS, title }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0];
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                return (
                  <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                    <p style={{ color: '#e6edf3', fontWeight: 600 }}>{d.name}</p>
                    <p style={{ color: '#8b949e' }}>{pct}%</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center: largest segment % */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold" style={{ color: colors[0] }}>
            {((data[0]?.value / total) * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-gray-600">{data[0]?.name}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span>{d.name}: {((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
