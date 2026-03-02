import { useEffect, useState } from 'react';
import { getPeerSuggestions } from '../api';

function formatMarketCap(v) {
  if (v == null) return '—';
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L Cr`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K Cr`;
  return `${v.toFixed(0)} Cr`;
}

export default function PeerGroupPanel({ selectedCompany, peerGroup, setPeerGroup, peerIds, setPeerIds, onClose }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch suggestions when panel opens and no peer group loaded
  useEffect(() => {
    if (!selectedCompany || peerGroup) return;
    setLoading(true);
    getPeerSuggestions(selectedCompany._id)
      .then((res) => {
        setPeerGroup(res.data);
        if (!peerIds) {
          setPeerIds(res.data.selected.map((c) => c._id));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCompany]);

  if (!selectedCompany) return null;

  // Combine selected + available for lookup
  const allCompanies = [...(peerGroup?.selected ?? []), ...(peerGroup?.available ?? [])];
  const companyMap = Object.fromEntries(allCompanies.map((c) => [c._id, c]));

  // Current peers = companies whose IDs are in peerIds
  const currentPeers = (peerIds ?? []).map((id) => companyMap[id]).filter(Boolean);
  const removablePeers = currentPeers.filter((c) => c._id !== selectedCompany._id);

  // Available = all companies not in peerIds and not the selected company
  const peerIdSet = new Set(peerIds ?? []);
  const availableCompanies = allCompanies
    .filter((c) => !peerIdSet.has(c._id) && c._id !== selectedCompany._id)
    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));

  const filteredAvailable = availableCompanies.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = (id) => {
    setPeerIds((prev) => prev.filter((pid) => pid !== id));
  };

  const handleAdd = (id) => {
    setPeerIds((prev) => [...prev, id]);
  };

  const handleReset = () => {
    if (peerGroup) {
      setPeerIds(peerGroup.selected.map((c) => c._id));
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-surface-800 border-l border-surface-600 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-white">Peer Group</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="text-xs text-accent-blue hover:text-blue-300 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading peers…
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Selected peers */}
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Selected ({currentPeers.length})
            </p>

            {/* The user's company — pinned */}
            <div className="flex items-center justify-between py-2 px-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg mb-1.5">
              <div className="min-w-0">
                <span className="text-xs font-medium text-accent-blue truncate block">{selectedCompany.company_name}</span>
                <span className="text-[10px] text-accent-blue/60">
                  {formatMarketCap(companyMap[selectedCompany._id]?.market_cap_rs_cr ?? selectedCompany.market_cap_rs_cr)}
                </span>
              </div>
              <span className="text-[10px] text-accent-blue/50 shrink-0 ml-2">You</span>
            </div>

            {/* Other peers — removable */}
            {removablePeers.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between py-1.5 px-3 hover:bg-surface-700 rounded-lg group transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-200 truncate block">{c.company_name}</span>
                  <span className="text-[10px] text-gray-500">{formatMarketCap(c.market_cap_rs_cr)}</span>
                </div>
                <button
                  onClick={() => handleRemove(c._id)}
                  className="text-gray-600 hover:text-red-400 transition-colors shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Divider + Add section */}
          <div className="border-t border-surface-600 px-4 py-3">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Add Companies ({availableCompanies.length})
            </p>
            <input
              type="text"
              placeholder="Search companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-white placeholder-gray-500 outline-none focus:border-accent-blue/50 mb-2"
            />
            <div className="max-h-48 overflow-y-auto">
              {filteredAvailable.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-3">No companies available</p>
              )}
              {filteredAvailable.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between py-1.5 px-3 hover:bg-surface-700 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-xs text-gray-300 truncate block">{c.company_name}</span>
                    <span className="text-[10px] text-gray-500">{formatMarketCap(c.market_cap_rs_cr)}</span>
                  </div>
                  <button
                    onClick={() => handleAdd(c._id)}
                    className="text-xs text-accent-blue hover:text-blue-300 font-medium shrink-0 ml-2 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-600 bg-surface-900/50 shrink-0">
        <p className="text-[11px] text-gray-500">
          Benchmarks will compare against {currentPeers.length} peer{currentPeers.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
