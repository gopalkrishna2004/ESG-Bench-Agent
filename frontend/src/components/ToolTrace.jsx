import { useState } from 'react';

const TOOL_ICONS = {
  get_companies: '🏢',
  get_company_benchmark: '📊',
  get_metric_ranking: '🏆',
  get_sector_stats: '📈',
};

const TOOL_LABELS = {
  get_companies: 'fetch_companies',
  get_company_benchmark: 'fetch_benchmark',
  get_metric_ranking: 'fetch_ranking',
  get_sector_stats: 'fetch_sector_stats',
};

function formatInput(tool, input) {
  if (!input || Object.keys(input).length === 0) return 'all_companies';
  return Object.entries(input)
    .map(([k, v]) => `${v}`)
    .join(' ');
}

export default function ToolTrace({ toolCalls, status }) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  const allDone = toolCalls.every((tc) => tc.status === 'done');
  const hasRunning = toolCalls.some((tc) => tc.status === 'running');

  return (
    <div className="mb-3">
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group w-full text-left"
      >
        <span className="font-mono font-medium text-accent-green">ESG Intel Agent</span>
        <span className="text-surface-500">—</span>
        {hasRunning ? (
          <span className="flex items-center gap-1 text-accent-orange">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            running…
          </span>
        ) : status === 'error' ? (
          <span className="text-accent-red">✗ error</span>
        ) : (
          <span className="text-accent-green">✓ complete</span>
        )}
        <svg
          className={`w-3 h-3 ml-auto text-gray-600 group-hover:text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Tool call items */}
      {expanded && (
        <div className="mt-2 space-y-1 pl-2 border-l border-surface-600">
          {toolCalls.map((tc) => (
            <div key={tc.callId} className="text-xs">
              <div className="flex items-center gap-2 py-0.5">
                <span className="font-mono text-accent-teal">{TOOL_LABELS[tc.tool] || tc.tool}</span>
                <span className="text-surface-500">—</span>
                <span className="text-gray-500 font-mono truncate max-w-[260px]">{formatInput(tc.tool, tc.input)}</span>
                {tc.status === 'running' ? (
                  <svg className="w-3 h-3 animate-spin text-accent-orange ml-auto shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <span className="text-accent-green ml-auto shrink-0">✓</span>
                )}
              </div>
              {tc.summary && (
                <p className="text-gray-500 pl-2 pb-1 font-mono" style={{ fontSize: '11px' }}>
                  ↳ {tc.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
