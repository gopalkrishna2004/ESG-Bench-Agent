const TAG_COLORS = {
  green: 'bg-green-900/40 text-green-400 border-green-800',
  blue: 'bg-blue-900/40 text-blue-400 border-blue-800',
  purple: 'bg-purple-900/40 text-purple-400 border-purple-800',
  yellow: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  orange: 'bg-orange-900/40 text-orange-400 border-orange-800',
};

const EFFORT_COLORS = {
  LOW: 'text-green-400',
  MED: 'text-yellow-400',
  HIGH: 'text-red-400',
};

const PILLAR_BORDER = {
  environmental: 'border-l-green-600',
  social: 'border-l-blue-600',
  governance: 'border-l-purple-600',
};

export default function RecommendationCards({ recommendations, activeRecs, onToggleRec }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => {
        const isActive = activeRecs?.[rec.id];
        return (
          <div
            key={rec.id}
            onClick={() => onToggleRec?.(rec.id)}
            className={`relative flex items-start gap-4 p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-200 ${
              PILLAR_BORDER[rec.pillar] || 'border-l-gray-600'
            } ${
              isActive
                ? 'bg-surface-700/80 border border-accent-green/30 shadow-lg shadow-green-900/10'
                : 'bg-surface-800 border border-surface-600 hover:bg-surface-700/60'
            }`}
          >
            {/* Number */}
            <div className="flex-shrink-0 w-10 text-center">
              <span className="text-2xl font-bold text-gray-600 tabular-nums">
                {String(rec.id).padStart(2, '0')}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white leading-snug mb-1">
                {rec.title}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                {rec.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rec.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      TAG_COLORS[tag.color] || TAG_COLORS.blue
                    }`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Impact & Effort */}
            <div className="flex-shrink-0 text-right space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wider">ESG Impact</div>
              <div className="text-lg font-bold text-accent-green">
                +{rec.esg_impact_pts}
              </div>
              <div className="text-[10px] text-gray-500">
                pts / effort:{' '}
                <span className={`font-semibold ${EFFORT_COLORS[rec.effort_level] || 'text-gray-400'}`}>
                  {rec.effort_level}
                </span>
              </div>
            </div>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute top-2 right-2">
                <span className="text-[10px] font-medium text-accent-green bg-green-900/30 px-1.5 py-0.5 rounded">
                  On
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
