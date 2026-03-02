import { useState, useEffect, useRef, useCallback } from 'react';
import { getCompanies, sendChatMessage, getBenchmarkData, getPeerComparisonData } from './api/index';
import Header from './components/Header';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ReportPage from './pages/ReportPage';
import PeerGroupPanel from './components/PeerGroupPanel';

const SUGGESTED_QUESTIONS = [
  'Give me a full analysis report',
  'What are our biggest ESG weaknesses?',
  'How do we rank against sector peers?',
  'What actions would improve our emissions score?',
  'Show our gender diversity vs the sector',
  'Which governance metrics need the most attention?',
];

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  // Peer group state
  const [peerGroup, setPeerGroup] = useState(null);
  const [peerIds, setPeerIds] = useState(null);
  const [showPeerPanel, setShowPeerPanel] = useState(false);

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedCompany) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const [benchRes, peerRes] = await Promise.all([
        getBenchmarkData(selectedCompany._id, peerIds),
        getPeerComparisonData(),
      ]);
      setReportData({ benchmarkData: benchRes.data, peerData: peerRes.data });
      setShowReport(true);
    } catch (err) {
      setReportError(err.message || 'Failed to load report data');
    } finally {
      setReportLoading(false);
    }
  }, [selectedCompany, peerIds]);

  useEffect(() => {
    getCompanies()
      .then((res) => setCompanies(res.data))
      .catch(console.error);
  }, []);

  // Reset peer group when company changes
  useEffect(() => {
    setPeerGroup(null);
    setPeerIds(null);
    setShowPeerPanel(false);
  }, [selectedCompany]);

  // Auto-open report when Gemini returns a 'report' chart type via chat
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last?.status === 'done' && last?.charts?.some((c) => c.type === 'report')) {
      handleGenerateReport();
    }
  }, [messages]);

  const buildHistory = (msgs) =>
    msgs
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.text))
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text || m.content || '' }))
      .filter((m) => m.content);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;

      const userMsg = { id: Date.now(), role: 'user', content: text };
      const agentMsgId = Date.now() + 1;
      const agentMsg = {
        id: agentMsgId,
        role: 'assistant',
        text: '',
        toolCalls: [],
        charts: [],
        status: 'streaming',
      };

      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setIsStreaming(true);

      const history = buildHistory(messages);

      try {
        await sendChatMessage(text, selectedCompany?._id, history, (event) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === agentMsgId);
            if (idx === -1) return prev;
            const msg = { ...prev[idx] };

            if (event.type === 'tool_call') {
              msg.toolCalls = [...msg.toolCalls, { callId: event.callId, tool: event.tool, input: event.input, status: 'running', summary: null }];
            } else if (event.type === 'tool_result') {
              msg.toolCalls = msg.toolCalls.map((tc) =>
                tc.callId === event.callId ? { ...tc, status: 'done', summary: event.summary } : tc
              );
            } else if (event.type === 'text') {
              msg.text = (msg.text || '') + event.content;
            } else if (event.type === 'done') {
              msg.status = 'done';
              msg.charts = event.charts || [];
            } else if (event.type === 'error') {
              msg.status = 'error';
              msg.error = event.message;
            }

            const updated = [...prev];
            updated[idx] = msg;
            return updated;
          });
        }, peerIds);
      } catch (err) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === agentMsgId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: 'error', error: err.message };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, selectedCompany, peerIds]
  );

  const clearChat = () => {
    if (!isStreaming) setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-surface-900 text-white overflow-hidden">
      {showReport && reportData && (
        <ReportPage
          company={selectedCompany}
          benchmarkData={reportData.benchmarkData}
          peerData={reportData.peerData}
          onClose={() => setShowReport(false)}
        />
      )}
      <Header
        companies={companies}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
        onClearChat={clearChat}
        onGenerateReport={handleGenerateReport}
        reportLoading={reportLoading}
        onTogglePeerPanel={() => setShowPeerPanel((v) => !v)}
        peerCount={peerIds?.length}
      />
      {reportError && (
        <div className="no-print px-4 py-2 bg-red-900/30 border-b border-red-700 text-xs text-red-400">
          Report error: {reportError}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            {/* Empty state */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">ESG Intelligence Agent</h2>
              <p className="text-sm text-gray-400 max-w-sm">
                Ask about peer comparisons, metric rankings, improvement strategies, and sector benchmarks.
                {!selectedCompany && <span className="block mt-1 text-accent-orange">Select a company above to enable company-specific analysis.</span>}
              </p>
            </div>

            {/* Suggested questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 hover:border-accent-blue/50 hover:bg-surface-700 text-sm text-gray-300 hover:text-white transition-all duration-150"
                >
                  <span className="text-accent-blue mr-2">›</span>{q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          selectedCompany={selectedCompany}
        />
      </div>

      {showPeerPanel && selectedCompany && (
        <PeerGroupPanel
          selectedCompany={selectedCompany}
          peerGroup={peerGroup}
          setPeerGroup={setPeerGroup}
          peerIds={peerIds}
          setPeerIds={setPeerIds}
          onClose={() => setShowPeerPanel(false)}
        />
      )}
    </div>
  );
}
