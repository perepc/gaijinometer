import { useState, useCallback, useRef, useEffect } from 'react';
import { useLang } from '../i18n.jsx';

// ── Markdown helpers ────────────────────────────────────────────────────────

const FLIGHT_MARKER_RE = /\[SEARCH_FLIGHTS:(\{[^}]+\})\]/;

function stripArtifacts(text) {
  return text
    .replace(/\[[^\]]{1,40}\]/g, '')
    .replace(/\(\d+\s*palabras?\)/gi, '')
    .replace(/\(\d+\s*words?\)/gi, '')
    .replace(/([^\n])(#{1,3} )/g, '$1\n\n$2')
    .replace(/([^\n])(- )/g, '$1\n$2')
    .split('\n')
    .map((line) => {
      const count = (line.match(/\*\*/g) ?? []).length;
      return count % 2 !== 0 ? line.replace(/\*\*/, '') : line;
    })
    .join('\n')
    .trim();
}

function renderInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**')) parts.push(<strong key={key++}>{match[2]}</strong>);
    else parts.push(<em key={key++}>{match[3]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

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

// ── Inline flight results card ──────────────────────────────────────────────

function formatDuration(iso) {
  if (!iso) return '';
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function FlightResultsCard({ data }) {
  const { t } = useLang();
  if (data.error) return <p className="ai-error">{data.error}</p>;
  if (!data.offers?.length) return <p className="ai-flight-empty">No flights found.</p>;

  return (
    <div className="ai-flight-results">
      <p className="ai-flight-results-title">
        ✈️ {t('flightResults', data.offers.length, data.total)}
      </p>
      {data.offers.map((o) => (
        <div key={o.id} className="ai-flight-card">
          <div className="ai-flight-top">
            <span className="ai-flight-airline">
              {o.airlineLogo && <img src={o.airlineLogo} alt={o.airline} className="ai-airline-logo" />}
              {o.airline}
            </span>
            <span className="ai-flight-price">
              {o.price.toLocaleString()} {o.currency}
            </span>
          </div>
          <div className="ai-flight-route">
            <span className="ai-flight-endpoint">
              <span className="ai-flight-iata">{o.originCode}</span>
              <span className="ai-flight-dt">{formatTime(o.departure)}</span>
            </span>
            <span className="ai-flight-mid">
              <span className="ai-flight-dur">{formatDuration(o.duration)}</span>
              <span className="ai-flight-line" />
              <span className="ai-flight-stops">
                {o.stops === 0 ? t('flightDirect') : `${o.stops} ${t('flightStop', o.stops)}`}
              </span>
            </span>
            <span className="ai-flight-endpoint ai-flight-endpoint--right">
              <span className="ai-flight-iata">{o.destinationCode}</span>
              <span className="ai-flight-dt">{formatTime(o.arrival)}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── API calls ───────────────────────────────────────────────────────────────

async function callApi(messages, context) {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  let data;
  try { data = await res.json(); } catch { throw new Error(`HTTP ${res.status} — invalid response`); }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error ?? data);
    throw new Error(msg);
  }
  return data.choices?.[0]?.message?.content ?? '';
}

async function callFlights(params) {
  const res = await fetch('/api/flights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ── Main component ──────────────────────────────────────────────────────────

const TRIGGER = { role: 'user', content: 'Hello, I want to plan a trip to Japan.' };

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter, lang }) {
  const { t } = useLang();
  // messages can be {role, content} or {role:'flights', data:{...}}
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const context = {
    topSpots: filteredSpots.slice(0, 15).map((s) => ({
      name: s.name, prefecture: s.prefecture, region: s.region,
      crowdCategory: s.crowdCategory, totalVisits: s.totalVisits,
    })),
    filter, mode, crowdFilter, lang,
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // After receiving an AI reply, detect flight search marker and trigger search
  async function processReply(reply, prevMessages) {
    const markerMatch = reply.match(FLIGHT_MARKER_RE);

    if (markerMatch) {
      // Strip marker from displayed text
      const cleanReply = reply.replace(FLIGHT_MARKER_RE, '').trim();
      const assistantMsg = { role: 'assistant', content: cleanReply };
      // Add assistant message (without marker) to conversation history too
      const updatedMessages = [...prevMessages, { role: 'assistant', content: reply }];

      let flightParams;
      try { flightParams = JSON.parse(markerMatch[1]); } catch { flightParams = null; }

      setMessages((prev) => [...prev, assistantMsg, { role: 'flights', data: { loading: true } }]);

      if (flightParams) {
        try {
          const data = await callFlights(flightParams);
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.findLastIndex((m) => m.role === 'flights');
            if (idx !== -1) next[idx] = { role: 'flights', data };
            return next;
          });
        } catch (err) {
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.findLastIndex((m) => m.role === 'flights');
            if (idx !== -1) next[idx] = { role: 'flights', data: { error: err.message } };
            return next;
          });
        }
      }
      return updatedMessages;
    }

    // No marker — normal assistant message
    const assistantMsg = { role: 'assistant', content: reply };
    setMessages((prev) => [...prev, assistantMsg]);
    return [...prevMessages, assistantMsg];
  }

  const handleStart = useCallback(async () => {
    setStarted(true);
    setMessages([]);
    setError(null);
    setLoading(true);
    try {
      const reply = await callApi([], context);
      setMessages([TRIGGER, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [filteredSpots, filter, mode, crowdFilter]); // eslint-disable-line

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Build API messages (only text messages, not flight cards)
    const apiMessages = [...messages, { role: 'user', content: text }]
      .filter((m) => m.role !== 'flights');

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const reply = await callApi(apiMessages, context);
      await processReply(reply, apiMessages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, messages, loading, filteredSpots, filter, mode, crowdFilter]); // eslint-disable-line

  const handleReset = () => { setMessages([]); setStarted(false); setError(null); setInput(''); };

  const modeLabel = { all: t('aiAllVisitors'), international: t('aiIntlOnly'), domestic: t('aiDomOnly') }[mode];
  const crowdLabel = { all: t('aiAllSpots'), local: t('aiLocalGems'), mixed: t('aiMixed'), tourist: t('aiTourist') }[crowdFilter];

  const visibleMessages = messages.filter((m) => m.role !== 'user' || m.content !== TRIGGER.content);

  return (
    <div className="ai-advisor">
      <div className="ai-header">
        <span className="ai-icon">🤖</span>
        <div>
          <p className="ai-title">{t('aiTitle')}</p>
          <p className="ai-subtitle">{t('aiSubtitle')}</p>
        </div>
        {started && (
          <button className="ai-reset-btn" title="New trip" onClick={handleReset}>{t('aiNew')}</button>
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

      {!started && (
        <div className="ai-start">
          <p className="ai-start-desc">{t('aiStartDesc')}</p>
          <button className="ai-ask-btn" onClick={handleStart} disabled={filteredSpots.length === 0}>
            {t('aiStartBtn')}
          </button>
        </div>
      )}

      {started && (
        <div className="ai-chat">
          <div className="ai-messages">
            {visibleMessages.map((msg, i) => {
              if (msg.role === 'flights') {
                return (
                  <div key={i} className="ai-bubble ai-bubble--assistant ai-bubble--flights">
                    {msg.data?.loading
                      ? <span className="ai-typing"><span/><span/><span/></span>
                      : <FlightResultsCard data={msg.data} />}
                  </div>
                );
              }
              return (
                <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                  <MarkdownText text={msg.content} />
                </div>
              );
            })}
            {loading && (
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
