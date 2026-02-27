import { useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { METRICS_CONFIG } from '../../utils/metricsConfig';

export default function ESGSimulator({
  currentScores,
  percentiles,
  toggles,
  onMetricToggle,
  onSliderChange,
  trajectory,
  projectedOverall,
}) {
  const metricEntries = useMemo(() => {
    return Object.entries(toggles).map(([metricKey, t]) => ({ metricKey, ...t }));
  }, [toggles]);

  const uplift = (projectedOverall || 0) - (currentScores?.overall || 0);

  return (
    <div className="mt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          ESG Improvement Simulator
        </h3>
      </div>

      {/* Score Projection Chart */}
      <div className="bg-surface-800 rounded-xl border border-surface-600 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          ESG Score Projection
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trajectory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="simScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3fb950" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="year"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#484f58', fontSize: 10 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val) => [`${val}`, 'ESG Score']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3fb950"
              strokeWidth={2}
              fill="url(#simScoreGradient)"
              dot={{ fill: '#3fb950', r: 4, strokeWidth: 0 }}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-gray-600 mt-1">
          Historical series is not available. This chart projects {trajectory?.[0]?.year} to{' '}
          {trajectory?.[trajectory.length - 1]?.year} from current score using slider inputs.
        </p>
      </div>

      {/* Metric Toggle Sliders */}
      <div className="space-y-1">
        {metricEntries.map(({ metricKey, enabled, currentPercentile, targetPercentile }) => {
          const config = METRICS_CONFIG[metricKey];
          if (!config) return null;
          const actualCurrent = percentiles?.[metricKey] ?? currentPercentile;
          const sliderValue = targetPercentile ?? actualCurrent;
          const delta = Math.round(sliderValue - actualCurrent);

          return (
            <div
              key={metricKey}
              className="bg-surface-800 rounded-lg border border-surface-600 px-4 py-3"
            >
              {/* Label + Toggle */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{config.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMetricToggle?.(metricKey);
                  }}
                  className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer select-none ${
                    enabled
                      ? 'text-accent-green bg-green-900/30'
                      : 'text-gray-500 bg-surface-700'
                  }`}
                >
                  {enabled ? 'On' : 'Off'}
                </button>
              </div>

              {/* Interactive Range Slider */}
              <div className="relative h-4 flex items-center">
                {/* Filled track behind the native slider */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent-blue pointer-events-none transition-all duration-100"
                  style={{ width: `${sliderValue}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(sliderValue)}
                  onChange={(e) => onSliderChange?.(metricKey, Number(e.target.value))}
                  className="sim-slider w-full relative z-10"
                />
              </div>

              {/* Labels */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">
                  Previous: {Math.round(actualCurrent)}th %ile
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    delta > 0 ? 'text-accent-green' : 'text-gray-500'
                  }`}
                >
                  Current: {Math.round(sliderValue)}th %ile
                  {delta > 0 && ` (+${delta})`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-800 rounded-xl border border-surface-600">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Previous ESG</div>
            <div className="text-2xl font-bold text-white">{currentScores?.overall ?? '—'}</div>
          </div>
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Current (Projected)</div>
            <div className={`text-2xl font-bold ${uplift > 0 ? 'text-accent-green' : 'text-white'}`}>
              {projectedOverall ?? '—'}
            </div>
          </div>
        </div>
        <div className="text-right max-w-[220px]">
          <span
            className={`text-xs font-semibold ${
              uplift > 0 ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            {uplift > 0
              ? `+${uplift} pts uplift possible with focused actions`
              : 'Drag sliders to see projected impact'}
          </span>
        </div>
      </div>
    </div>
  );
}
