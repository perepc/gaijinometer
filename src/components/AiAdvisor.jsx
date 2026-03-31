import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLang } from '../i18n.jsx';
import { stripArtifacts } from '../utils/markdown.js';
import {
  loadSessions, saveSession, deleteSession,
  isOld, filtersChanged, sessionPreview, formatSavedAt, newSessionId,
} from '../utils/sessions.js';

// ── Markdown renderer ───────────────────────────────────────────────────────

// Render only spot links within a string (used inside bold/italic spans)
function renderSpotLinks(text, spotPattern, spotsByLower, onHover, onLeave, onClickSpot) {
  const re = new RegExp(spotPattern.source, 'gi');
  const parts = [];
  let last = 0, key = 0, match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const spot = spotsByLower[match[0].toLowerCase()];
    parts.push(spot
      ? <mark key={`sp${key++}`} className="ai-spot-link"
          onMouseEnter={() => onHover(spot)} onMouseLeave={onLeave}
          onClick={() => onClickSpot?.(spot)}>{match[0]}</mark>
      : match[0]
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Single-pass parser: bold (**), italic (*), and spot links in one regex
function renderWithSpots(text, spotPattern, spotsByLower, onHover, onLeave, onClickSpot) {
  const spotSrc = spotPattern ? spotPattern.source : null;
  const combined = new RegExp(
    `(\\*\\*(.+?)\\*\\*)|(\\*([^*]+?)\\*)${spotSrc ? `|(${spotSrc})` : ''}`,
    'gi'
  );
  const parts = [];
  let last = 0, key = 0, match;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      // Bold — process spot links inside
      const inner = spotSrc
        ? renderSpotLinks(match[2], spotPattern, spotsByLower, onHover, onLeave, onClickSpot)
        : [match[2]];
      parts.push(<strong key={key++}>{inner}</strong>);
    } else if (match[3]) {
      // Italic — process spot links inside
      const inner = spotSrc
        ? renderSpotLinks(match[4], spotPattern, spotsByLower, onHover, onLeave, onClickSpot)
        : [match[4]];
      parts.push(<em key={key++}>{inner}</em>);
    } else if (match[5]) {
      // Spot name at top level
      const spot = spotsByLower[match[5].toLowerCase()];
      parts.push(spot
        ? <mark key={`sp${key++}`} className="ai-spot-link"
            onMouseEnter={() => onHover(spot)} onMouseLeave={onLeave}
            onClick={() => onClickSpot?.(spot)}>{match[5]}</mark>
        : match[5]
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownText({ text, spotPattern, spotsByLower, onSpotHover, onSpotLeave, onSpotClick }) {
  const clean = stripArtifacts(text);
  const lines = clean.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const render = (t) => renderWithSpots(t, spotPattern, spotsByLower, onSpotHover, onSpotLeave, onSpotClick);

  const flushList = () => {
    if (listItems.length) { elements.push(<ul key={key++}>{listItems}</ul>); listItems = []; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^#{1,3}$/.test(line)) { flushList(); continue; }
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      elements.push(<p key={key++} className="ai-msg-heading">{render(line.replace(/^#{1,3}\s/, ''))}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(<li key={key++}>{render(line.replace(/^[-•]\s*/, ''))}</li>);
    } else {
      flushList();
      elements.push(<p key={key++}>{render(line)}</p>);
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

// ── Itinerary export ────────────────────────────────────────────────────────

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function inlineHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
}

function msgToHtml(text) {
  const lines = stripArtifacts(text).split('\n');
  const out = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { out.push('</ul>'); inList = false; }
      continue;
    }
    if (line.startsWith('### ')) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h3>${inlineHtml(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## '))  { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h2>${inlineHtml(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# '))   { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h1>${inlineHtml(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineHtml(line.slice(2))}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p>${inlineHtml(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function exportItinerary(visibleMessages, title, contextLine) {
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; font-size: 15px; line-height: 1.7; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  h2 { font-size: 18px; margin-top: 28px; margin-bottom: 6px; }
  h3 { font-size: 15px; margin-top: 20px; margin-bottom: 4px; }
  p { margin: 6px 0; }
  ul { margin: 6px 0 10px 20px; padding: 0; }
  li { margin: 3px 0; }
  .bubble-user { background: #f4f4f4; border-left: 3px solid #bbb; padding: 8px 12px; margin: 16px 0 4px; font-style: italic; color: #444; }
  .bubble-assistant { margin: 4px 0 20px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${esc(title)}</h1>
<div class="meta">${esc(date)}${contextLine ? ' &nbsp;·&nbsp; ' + esc(contextLine) : ''}</div>
${visibleMessages.map((m) => m.role === 'user'
  ? `<div class="bubble-user">${esc(m.content)}</div>`
  : `<div class="bubble-assistant">${msgToHtml(m.content)}</div>`
).join('\n')}
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
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

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter, lang, onSpotHighlight, onSpotClick }) {
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

  const spotsByLower = useMemo(() => {
    const map = {};
    filteredSpots.forEach((s) => { map[s.name.toLowerCase()] = s; });
    return map;
  }, [filteredSpots]);

  const spotPattern = useMemo(() => {
    if (!filteredSpots.length) return null;
    const names = filteredSpots
      .map((s) => s.name)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(names.join('|'), 'i');
  }, [filteredSpots]);

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
          <div className="ai-header-actions">
            {visibleMessages.length > 2 && !loading && !showPicker && (
              <button className="ai-export-btn" onClick={() => exportItinerary(
                visibleMessages, t('aiExportTitle'),
                `${filteredSpots.length} ${t('aiDests')} · ${crowdLabel}`
              )}>
                {t('aiExport')}
              </button>
            )}
            <button className="ai-reset-btn" onClick={() => setShowPicker(true)}>
              {t('aiNew')}
            </button>
          </div>
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
                <MarkdownText
                  text={msg.content}
                  spotPattern={msg.role === 'assistant' ? spotPattern : null}
                  spotsByLower={spotsByLower}
                  onSpotHover={onSpotHighlight}
                  onSpotLeave={() => onSpotHighlight?.(null)}
                  onSpotClick={onSpotClick}
                />
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
