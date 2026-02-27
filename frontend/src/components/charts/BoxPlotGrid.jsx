function formatVal(v, unit) {
  if (v == null) return '';
  if (unit === '%') return `${Number(v).toFixed(1)}%`;
  if (unit === 'ratio') return Number(v).toFixed(2);
  if (unit === 'year') return String(Math.round(v));
  if (unit === 'rate') return Number(v).toFixed(3);
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return Number(v).toFixed(1);
}

function BoxRow({ label, min, max, p25, p50, p75, companyValue, lowerIsBetter, unit }) {
  if (min == null || max == null || min === max) return null;

  const range = max - min;
  const toPct = (v) => Math.min(Math.max(((v - min) / range) * 100, 0), 100);

  const boxLeft = toPct(p25 ?? min);
  const boxRight = toPct(p75 ?? max);
  const boxWidth = Math.max(boxRight - boxLeft, 0.5);
  const medianPos = toPct(p50 ?? (min + max) / 2);
  const companyPos = companyValue != null ? toPct(companyValue) : null;

  // Color the company marker
  let markerColor = '#484f58';
  if (companyValue != null && p25 != null && p75 != null) {
    const isTop = lowerIsBetter ? companyValue <= p25 : companyValue >= p75;
    const isBot = lowerIsBetter ? companyValue >= p75 : companyValue <= p25;
    markerColor = isTop ? '#3fb950' : isBot ? '#f85149' : '#d29922';
  }

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-surface-700 last:border-0">
      {/* Metric label + value */}
      <div className="w-36 shrink-0 text-right">
        <p className="text-xs font-medium text-gray-400 leading-tight">{label}</p>
        {companyValue != null && (
          <p className="text-[10px]" style={{ color: markerColor }}>{formatVal(companyValue, unit)} {unit}</p>
        )}
      </div>

      {/* Box plot track */}
      <div className="flex-1 relative" style={{ height: 20 }}>
        {/* Whisker line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-surface-500" style={{ transform: 'translateY(-50%)' }} />

        {/* IQR box */}
        <div
          className="absolute top-1/2 rounded-sm"
          style={{
            left: `${boxLeft}%`, width: `${boxWidth}%`, height: 12,
            background: '#30363d',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Median line */}
        <div
          className="absolute top-1/2 rounded-sm"
          style={{
            left: `${medianPos}%`, width: 2, height: 16,
            background: '#8b949e',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Company marker */}
        {companyPos != null && (
          <div
            className="absolute top-1/2 rounded-full"
            style={{
              left: `${companyPos}%`, width: 10, height: 10,
              background: markerColor,
              border: '2px solid #161b22',
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 6px ${markerColor}80`,
              zIndex: 10,
            }}
            title={`${label}: ${formatVal(companyValue, unit)} ${unit}`}
          />
        )}
      </div>

      {/* P25/P75 labels */}
      <div className="w-20 shrink-0 text-[10px] text-gray-600 text-right leading-tight">
        <div>P25: {formatVal(p25, unit)}</div>
        <div>P75: {formatVal(p75, unit)}</div>
      </div>
    </div>
  );
}

export default function BoxPlotGrid({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-600 pb-1 border-b border-surface-600">
        <div className="w-36 text-right">Metric</div>
        <div className="flex-1 flex justify-between px-1">
          <span>Min</span>
          <span>← Distribution →</span>
          <span>Max</span>
        </div>
        <div className="w-20 text-right">Quartiles</div>
      </div>
      {data.map((d) => (
        <BoxRow key={d.metric} {...d} />
      ))}
      <div className="flex gap-4 mt-3 text-xs text-gray-600 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#3fb950]" /> Above P75 (strong)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#d29922]" /> P25–P75 (average)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#f85149]" /> Below P25 (weak)
        </span>
      </div>
    </div>
  );
}
