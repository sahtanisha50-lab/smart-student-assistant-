import { API_BASE } from './api';
import { eventBus } from './eventBus';

let es = null;

function startSSE() {
  if (typeof window === 'undefined') return;
  if (es) return es;
  // EventSource needs a full URL; API_BASE already contains /api
  const full = `${API_BASE}/stream?_=${Date.now()}`;
  try {
    es = new EventSource(full, { withCredentials: true });
  } catch (err) {
    es = new EventSource(full);
  }

  const makeHandler = (name) => (e) => {
    try {
      const payload = JSON.parse(e.data);
      eventBus.emit(name, payload);
    } catch (err) {
      // ignore parse errors
    }
  };

  const events = [
    'client:updated',
    'entity:updated',
    'note:created',
    'note:updated',
    'note:deleted',
    'reminder:created',
    'reminder:updated',
    'reminder:deleted'
  ];

  events.forEach((ev) => es.addEventListener(ev, makeHandler(ev)));

  es.onopen = () => eventBus.emit('sse:open');
  es.onerror = (err) => eventBus.emit('sse:error', err);

  return es;
}

function stopSSE() {
  if (!es) return;
  try { es.close(); } catch (e) {}
  es = null;
}

export { startSSE, stopSSE };
