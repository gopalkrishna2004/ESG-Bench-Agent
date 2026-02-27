const METRIC_LABELS = {
  scope_1: 'Scope 1',
  scope_2: 'Scope 2',
  renewable_energy_pct: 'Renewable %',
  water_consumption: 'Water',
  gender_diversity_pct: 'Gender Div',
  board_women_percent: 'Board Women',
  ltifr: 'LTIFR',
  employee_turnover_rate: 'Turnover',
  independent_directors_percent: 'Indep. Dir.',
  data_breaches: 'Breaches',
};

function scoreColor(score) {
  if (score == null) return '#21262d';
  if (score >= 80) return '#1a4731';
  if (score >= 60) return '#1c3a4a';
  if (score >= 40) return '#3a2c14';
  if (score >= 20) return '#3a1c14';
  return '#2d1414';
}

function scoreText(score) {
  if (score == null) return '#484f58';
  if (score >= 80) return '#3fb950';
  if (score >= 60) return '#39d0d8';
  if (score >= 40) return '#d29922';
  if (score >= 20) return '#f0883e';
  return '#f85149';
}

export default function HeatmapChart({ data, metrics, selectedId }) {
  if (!data || data.length === 0) return null;
  const cols = (metrics || []).filter((m) => METRIC_LABELS[m] || m);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th className="text-left text-gray-500 font-medium py-2 pr-3 sticky left-0 bg-surface-800" style={{ minWidth: 120 }}>Company</th>
            {cols.map((m) => (
              <th key={m} className="text-center text-gray-500 font-medium pb-2 px-1" style={{ minWidth: 62 }}>
                {METRIC_LABELS[m] || m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isSelected = row._id === selectedId || row._id?.toString() === selectedId?.toString();
            return (
              <tr key={row._id} className={isSelected ? 'ring-1 ring-accent-blue rounded' : ''}>
                <td
                  className={`py-1.5 pr-3 font-medium sticky left-0 ${isSelected ? 'text-accent-blue bg-surface-700' : 'text-gray-300 bg-surface-800'}`}
                  style={{ maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {isSelected && <span className="mr-1 text-accent-blue">★</span>}
                  {row.company_name}
                </td>
                {cols.map((m) => {
                  const score = row[m];
                  return (
                    <td
                      key={m}
                      className="text-center py-1.5 px-1 rounded font-semibold"
                      style={{
                        background: scoreColor(score),
                        color: scoreText(score),
                      }}
                    >
                      {score != null ? Math.round(score) : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
