import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

function avg(arr) {
  const valid = arr.filter((v) => v != null);
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function CustomDot(props) {
  const { cx, cy, payload, selectedName } = props;
  const isSelected = payload.name === selectedName;
  return (
    <g>
      <circle cx={cx} cy={cy} r={isSelected ? 9 : 5}
        fill={isSelected ? '#58a6ff' : '#484f58'}
        opacity={isSelected ? 1 : 0.65}
      />
      {isSelected && (
        <circle cx={cx} cy={cy} r={13} fill="none" stroke="#58a6ff" strokeWidth={1.5} opacity={0.4} />
      )}
    </g>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#c9d1d9' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
      <p style={{ color: '#3fb950' }}>Environmental: <strong>{d.x}</strong>/100</p>
      <p style={{ color: '#58a6ff' }}>Social: <strong>{d.y}</strong>/100</p>
    </div>
  );
}

export default function EnvSocialScatter({ data: companies, selectedName }) {
  if (!companies || companies.length === 0) return null;

  const allData = companies
    .filter((c) => c.environment_score != null && c.social_score != null)
    .map((c) => ({ x: c.environment_score, y: c.social_score, name: c.company_name }));

  const eAvg = avg(companies.map((c) => c.environment_score));
  const sAvg = avg(companies.map((c) => c.social_score));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Each dot = one company · dashed lines = sector averages
        {selectedName && <> · <span className="text-[#58a6ff] font-medium">● = {selectedName}</span></>}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            type="number" dataKey="x" name="Environmental" domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#6e7681' }} tickLine={false} axisLine={false}
            label={{ value: 'Environmental Score', position: 'insideBottom', offset: -15, fontSize: 10, fill: '#6e7681' }}
          />
          <YAxis
            type="number" dataKey="y" name="Social" domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#6e7681' }} tickLine={false} axisLine={false}
            label={{ value: 'Social Score', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#6e7681' }}
          />
          <ZAxis range={[50, 50]} />
          {eAvg != null && (
            <ReferenceLine x={eAvg} stroke="#484f58" strokeDasharray="4 3"
              label={{ value: 'E avg', fontSize: 9, fill: '#6e7681' }} />
          )}
          {sAvg != null && (
            <ReferenceLine y={sAvg} stroke="#484f58" strokeDasharray="4 3"
              label={{ value: 'S avg', fontSize: 9, fill: '#6e7681' }} />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={allData}
            shape={(props) => <CustomDot {...props} selectedName={selectedName} />}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
