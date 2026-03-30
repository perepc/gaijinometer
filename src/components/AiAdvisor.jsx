import { useState, useCallback, useRef, useEffect } from 'react';
import { useLang } from '../i18n.jsx';
import { stripArtifacts, renderInline } from '../utils/markdown.js';
import {
  loadSessions, saveSession, deleteSession,
  isOld, filtersChanged, sessionPreview, formatSavedAt, newSessionId,
} from '../utils/sessions.js';

// ── Markdown renderer ───────────────────────────────────────────────────────

function MarkdownText({ text }) {
  const clean = stripArtifacts(text);
  const lines = clean.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) { elements.push(<ul key={key++}>{listItems}</ul>); listItems = []; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^#{1,3}$/.test(line)) { flushList(); continue; }
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      elements.push(<p key={key++} className="ai-msg-heading">{renderInline(line.replace(/^#{1,3}\s/, ''))}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(<li key={key++}>{renderInline(line.replace(/^[-•]\s*/, ''))}</li>);
    } else {
      flushList();
      elements.push(<p key={key++}>{renderInline(line)}</p>);
    }
  }
  flushList();
  return <>{elements}</>;
}

// ── Session picker ──────────────────────────────────────────────────────────

function SessionPicker({ sessions, onSelect, onNew, onClose }) {
  const { t } = useLang();
  return (
    <div className="ai-session-picker">
      <div className="ai-session-picker-header">
        <span>{t('sessionPickerTitle')}</span>
        <button className="ai-session-close" onClick={onClose}>✕</button>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="ai-session-item">
          <button className="ai-session-item-btn" onClick={() => onSelect(s)}>
            <span className="ai-session-date">{formatSavedAt(s.savedAt)}</span>
            <span className="ai-session-preview">{sessionPreview(s.messages)}</span>
          </button>
          <button
            className="ai-session-delete"
            title="Delete"
            onClick={() => deleteSession(s.id) || onClose()}
          >🗑</button>
        </div>
      ))}
      <button className="ai-session-new-btn" onClick={onNew}>
        + {t('sessionNew')}
      </button>
    </div>
  );
}

// ── API call (streaming) ────────────────────────────────────────────────────

async function callApi(messages, context, onChunk) {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    let data;
    try { data = await res.json(); } catch { throw new Error(`HTTP ${res.status}`); }
    const msg = typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error ?? data);
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content ?? '';
        if (delta) { fullContent += delta; onChunk?.(fullContent); }
      } catch { /* ignore malformed lines */ }
    }
  }

  return fullContent;
}

// ── Main component ──────────────────────────────────────────────────────────

const TRIGGER = { role: 'user', content: 'Hello, I want to plan a trip to Japan.' };

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter, lang }) {
  const { t } = useLang();
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [started, setStarted]         = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [showPicker, setShowPicker]   = useState(false);
  const [warns, setWarns]             = useState({ old: false, filters: false });
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const context = {
    topSpots: filteredSpots.slice(0, 15).map((s) => ({
      name: s.name, prefecture: s.prefecture, region: s.region,
      crowdCategory: s.crowdCategory, totalVisits: s.totalVisits,
    })),
    filter, mode, crowdFilter, lang,
  };

  // Restore latest session silently on mount
  useEffect(() => {
    const sessions = loadSessions();
    if (!sessions.length) return;
    const latest = sessions[0];
    setMessages(latest.messages);
    setStarted(true);
    setSessionId(latest.id);
    setWarns({
      old: isOld(latest),
      filters: filtersChanged(latest, mode, crowdFilter),
    });
  }, []); // eslint-disable-line

  // Persist session when streaming finishes (loading → false)
  useEffect(() => {
    if (loading || !started || messages.length < 2 || !sessionId) return;
    saveSession({ id: sessionId, savedAt: Date.now(), messages, contextSnapshot: { mode, crowdFilter } });
  }, [messages, started, sessionId, loading]); // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNew = useCallback(async () => {
    const id = newSessionId();
    setSessionId(id);
    setWarns({ old: false, filters: false });
    setShowPicker(false);
    setStarted(true);
    setError(null);
    setLoading(true);
    const base = [TRIGGER, { role: 'assistant', content: '' }];
    setMessages(base);
    try {
      await callApi([], context, (partial) => {
        setMessages([TRIGGER, { role: 'assistant', content: partial }]);
      });
    } catch (err) {
      setError(err.message);
      setMessages([TRIGGER]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [filteredSpots, filter, mode, crowdFilter]); // eslint-disable-line

  // Keep handleStart as alias for startNew (used by the start button)
  const handleStart = startNew;

  const handleSelectSession = useCallback((s) => {
    setMessages(s.messages);
    setStarted(true);
    setSessionId(s.id);
    setShowPicker(false);
    setWarns({
      old: isOld(s),
      filters: filtersChanged(s, mode, crowdFilter),
    });
  }, [mode, crowdFilter]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const apiMessages = [...messages, { role: 'user', content: text }];
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      await callApi(apiMessages, context, (partial) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: partial };
          return next;
        });
      });
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, messages, loading, filteredSpots, filter, mode, crowdFilter]); // eslint-disable-line

  const modeLabel  = { all: t('aiAllVisitors'), international: t('aiIntlOnly'), domestic: t('aiDomOnly') }[mode];
  const crowdLabel = { all: t('aiAllSpots'), local: t('aiLocalGems'), mixed: t('aiMixed'), tourist: t('aiTourist') }[crowdFilter];
  const visibleMessages = messages.filter((m) => m.content !== TRIGGER.content);
  const savedSessions = loadSessions();

  return (
    <div className="ai-advisor">
      <div className="ai-header">
        <span className="ai-icon">🤖</span>
        <div>
          <p className="ai-title">{t('aiTitle')}</p>
          <p className="ai-subtitle">{t('aiSubtitle')}</p>
        </div>
        {started && (
          <button className="ai-reset-btn" onClick={() => setShowPicker(true)}>
            {t('aiNew')}
          </button>
        )}
      </div>

      <div className="ai-context">
        <p className="ai-context-title">{t('aiContext')}</p>
        <div className="ai-context-pills">
          <span className="ai-pill">{modeLabel}</span>
          <span className="ai-pill">{crowdLabel}</span>
          <span className="ai-pill">{filteredSpots.length} {t('aiDests')}</span>
        </div>
      </div>

      {showPicker && (
        <SessionPicker
          sessions={savedSessions}
          onSelect={handleSelectSession}
          onNew={startNew}
          onClose={() => setShowPicker(false)}
        />
      )}

      {!started && !showPicker && (
        <div className="ai-start">
          <p className="ai-start-desc">{t('aiStartDesc')}</p>
          <button className="ai-ask-btn" onClick={handleStart} disabled={filteredSpots.length === 0}>
            {t('aiStartBtn')}
          </button>
          {savedSessions.length > 0 && (
            <button className="ai-session-resume-btn" onClick={() => setShowPicker(true)}>
              {t('sessionResume', savedSessions.length)}
            </button>
          )}
        </div>
      )}

      {started && !showPicker && (
        <div className="ai-chat">
          {(warns.old || warns.filters) && (
            <div className="ai-session-warns">
              {warns.old && <span className="ai-session-warn">📅 {t('sessionWarnOld')}</span>}
              {warns.filters && <span className="ai-session-warn">⚠ {t('sessionWarnFilters')}</span>}
            </div>
          )}
          <div className="ai-messages">
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                <MarkdownText text={msg.content} />
              </div>
            ))}
            {loading && visibleMessages.at(-1)?.content === '' && (
              <div className="ai-bubble ai-bubble--assistant">
                <span className="ai-typing"><span/><span/><span/></span>
              </div>
            )}
            {error && <p className="ai-error">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="ai-input-row">
            <textarea
              ref={inputRef}
              className="ai-chat-input"
              rows={1}
              placeholder={t('aiPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <button className="ai-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
