import { useState, useRef, useEffect } from 'react';

const PILLAR_COLORS = {
  E: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
  S: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  G: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
};

export default function Header({ companies, selectedCompany, onSelectCompany, onClearChat, onGenerateReport, reportLoading }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = companies.filter((c) =>
    !query || c.company_name?.toLowerCase().includes(query.toLowerCase()) || c.bse_code?.includes(query)
  );

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-surface-800 border-b border-surface-600 shrink-0">
      {/* Left: Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">ESG Benchmarking & Intelligence Agent</h1>
          <p className="text-xs text-gray-500">Ask about peer comparisons, ratings, targets, investors, emerging trends</p>
        </div>
      </div>

      {/* Center: Company selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setSearchOpen((o) => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            selectedCompany
              ? 'bg-surface-700 border-accent-blue/50 text-white'
              : 'bg-surface-700 border-surface-500 text-gray-400 hover:border-accent-blue/40 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {selectedCompany ? (
            <span>{selectedCompany.company_name}</span>
          ) : (
            <span>Select Company</span>
          )}
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {searchOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-80 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-surface-600">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search company or BSE code…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-700 text-sm text-white placeholder-gray-500 rounded-lg px-3 py-2 outline-none border border-surface-500 focus:border-accent-blue/50"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-gray-500 text-center">No companies found</li>
              )}
              {filtered.map((c) => (
                <li key={c._id}>
                  <button
                    onClick={() => { onSelectCompany(c); setSearchOpen(false); setQuery(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-700 transition-colors flex items-center justify-between ${
                      selectedCompany?._id === c._id ? 'bg-surface-700 text-accent-blue' : 'text-white'
                    }`}
                  >
                    <span className="font-medium">{c.company_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.bse_code}</span>
                  </button>
                </li>
              ))}
            </ul>
            {selectedCompany && (
              <div className="p-2 border-t border-surface-600">
                <button
                  onClick={() => { onSelectCompany(null); setSearchOpen(false); }}
                  className="w-full text-xs text-gray-500 hover:text-accent-red py-1.5 transition-colors"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {selectedCompany && (
          <span className="text-xs text-gray-500 bg-surface-700 px-2 py-1 rounded border border-surface-600">
            {selectedCompany.sector}
          </span>
        )}

        {/* Generate Report button */}
        <button
          onClick={onGenerateReport}
          disabled={!selectedCompany || reportLoading}
          title={!selectedCompany ? 'Select a company first' : 'Generate full ESG analysis report'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            selectedCompany && !reportLoading
              ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue hover:bg-accent-blue/20 hover:border-accent-blue/60'
              : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {reportLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Report
            </>
          )}
        </button>

        <button
          onClick={onClearChat}
          title="Clear chat"
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
