import ToolTrace from './ToolTrace';
import InlineCharts from './InlineCharts';

// Basic markdown-to-JSX renderer (bold, italic, code, headers, lists)
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc pl-5 mb-2 space-y-0.5 text-sm text-gray-200">{listItems}</ul>);
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="text-sm font-semibold text-white mt-3 mb-1">{inlineFormat(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="text-base font-semibold text-white mt-3 mb-1">{inlineFormat(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{inlineFormat(line.slice(2))}</h1>);
    }
    // List items
    else if (line.match(/^[-*] /)) {
      listItems.push(<li key={i} className="text-gray-200">{inlineFormat(line.slice(2))}</li>);
    } else if (line.match(/^\d+\. /)) {
      listItems.push(<li key={i} className="text-gray-200">{inlineFormat(line.replace(/^\d+\. /, ''))}</li>);
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
      if (elements.length > 0) elements.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph line
    else {
      flushList();
      elements.push(<p key={i} className="text-sm text-gray-200 leading-relaxed">{inlineFormat(line)}</p>);
    }
  });

  flushList();
  return elements;
}

function inlineFormat(text) {
  // Split by code, bold, italic patterns
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const token = m[0];
    if (token.startsWith('`')) {
      parts.push(<code key={key++} className="bg-surface-700 px-1 py-0.5 rounded text-accent-blue font-mono text-xs">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key++} className="italic text-gray-300">{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length > 0 ? parts : text;
}

export default function AgentMessage({ message }) {
  const { toolCalls, text, charts, status, error } = message;
  const isStreaming = status === 'streaming';

  return (
    <div className="flex gap-3 max-w-4xl">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-accent-green/20 border border-accent-green/30 flex items-center justify-center mt-0.5">
        <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        {/* Tool call traces */}
        <ToolTrace toolCalls={toolCalls} status={status} />

        {/* Error */}
        {status === 'error' && (
          <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-3 mb-3">
            Analysis failed — {error || 'could not reach API. Please check your connection.'}
          </div>
        )}

        {/* Text response */}
        {(text || isStreaming) && (
          <div className={`text-sm leading-relaxed space-y-0.5 ${isStreaming && !text ? 'streaming-cursor' : ''}`}>
            {text ? renderMarkdown(text) : null}
            {isStreaming && text && <span className="streaming-cursor" />}
          </div>
        )}

        {/* Inline charts */}
        {charts && charts.length > 0 && (
          <InlineCharts charts={charts} />
        )}
      </div>
    </div>
  );
}
