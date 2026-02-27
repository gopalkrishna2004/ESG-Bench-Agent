import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled, selectedCompany }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  return (
    <div className="px-4 pb-4 pt-2 bg-surface-900 border-t border-surface-700">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-surface-800 border border-surface-600 rounded-2xl px-4 py-3 focus-within:border-accent-blue/40 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedCompany
              ? `Ask about ${selectedCompany.company_name}'s ESG performance…`
              : 'Ask about emissions benchmarks, rating improvement, investor priorities, best practices…'
          }
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed min-h-[24px] max-h-[160px]"
          style={{ overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            value.trim() && !disabled
              ? 'bg-accent-blue text-white hover:bg-blue-400'
              : 'bg-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {disabled ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
        </button>
      </form>
      <p className="text-center text-xs text-gray-600 mt-2">
        Enter to send · Shift+Enter for newline · Try asking for "peer scores", "gap to leader", "env vs social", or "pillar breakdown top 8" for quick charts!
      </p>
    </div>
  );
}
