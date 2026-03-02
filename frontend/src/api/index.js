import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getCompanies = () => api.get('/companies');
export const getCompany = (id) => api.get(`/companies/${id}`);
export const getBenchmarkData = (id, peerIds) => {
  const params = peerIds?.length ? `?peerIds=${peerIds.join(',')}` : '';
  return api.get(`/benchmarks/company/${id}${params}`);
};
export const getPeerComparisonData = () => api.get('/benchmarks/peer-comparison');
export const getPeerSuggestions = (companyId) => api.get(`/companies/${companyId}/peer-suggestions`);

/**
 * Send a chat message and stream SSE events back.
 * @param {string} message
 * @param {string|null} companyId
 * @param {Array} history  — [{role, content}]
 * @param {function} onEvent  — called with each parsed event object
 * @returns {Promise<void>}
 */
export async function sendChatMessage(message, companyId, history, onEvent, peerIds = null) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, companyId, history, peerIds }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Chat request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}
