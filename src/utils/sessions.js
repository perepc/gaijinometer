const KEY = 'gaijinometer_sessions';
const MAX = 3;
const WARN_MS  = 7  * 24 * 60 * 60 * 1000; // 7 days  → show warning
const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days → auto-delete

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const now = Date.now();
    return JSON.parse(raw).filter((s) => now - s.savedAt < EXPIRE_MS);
  } catch {
    return [];
  }
}

export function saveSession(session) {
  try {
    let sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) sessions[idx] = session;
    else { sessions.unshift(session); if (sessions.length > MAX) sessions.length = MAX; }
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch { /* quota errors — ignore */ }
}

export function deleteSession(id) {
  try {
    const sessions = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {}
}

export function isOld(session) {
  return Date.now() - session.savedAt > WARN_MS;
}

export function filtersChanged(session, mode, crowdFilter) {
  return session.contextSnapshot?.mode !== mode ||
    session.contextSnapshot?.crowdFilter !== crowdFilter;
}

const TRIGGER_CONTENT = 'Hello, I want to plan a trip to Japan.';

export function sessionPreview(messages) {
  const answers = messages.filter((m) => m.role === 'user' && m.content !== TRIGGER_CONTENT);
  if (!answers.length) return '—';
  const text = answers.slice(0, 2).map((m) => m.content).join(' · ');
  return text.length > 65 ? text.slice(0, 62) + '…' : text;
}

export function formatSavedAt(ts) {
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function newSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
