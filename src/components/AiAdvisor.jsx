import { useState, useCallback, useRef, useEffect } from 'react';
import { useLang } from '../i18n.jsx';

function stripArtifacts(text) {
  return text
    .replace(/\[[^\]]{1,40}\]/g, '')
    .replace(/\(\d+\s*palabras?\)/gi, '')
    .replace(/\(\d+\s*words?\)/gi, '')
    // Ensure headers (###, ##, #) always start on their own line
    .replace(/([^\n])(#{1,3} )/g, '$1\n\n$2')
    // Ensure bullet points always start on their own line
    .replace(/([^\n])(- )/g, '$1\n$2')
    .trim();
}

// Render inline markdown: **bold**, *italic*
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

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter, lang }) {
  const { t } = useLang();
  const [messages, setMessages] = useState([]);   // {role, content}[]
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

  const appendAssistant = (content) => {
    setMessages((prev) => [...prev, { role: 'assistant', content }]);
  };

  const TRIGGER = { role: 'user', content: 'Hello, I want to plan a trip to Japan.' };

  const handleStart = useCallback(async () => {
    setStarted(true);
    setMessages([]);
    setError(null);
    setLoading(true);
    try {
      const reply = await callApi([], context);
      // Store trigger msg + reply so future turns alternate user/assistant correctly
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
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const reply = await callApi(newMessages, context);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
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

  return (
    <div className="ai-advisor">
      {/* Header */}
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

      {/* Context pills */}
      <div className="ai-context">
        <p className="ai-context-title">{t('aiContext')}</p>
        <div className="ai-context-pills">
          <span className="ai-pill">{modeLabel}</span>
          <span className="ai-pill">{crowdLabel}</span>
          <span className="ai-pill">{filteredSpots.length} {t('aiDests')}</span>
        </div>
      </div>

      {/* Start screen */}
      {!started && (
        <div className="ai-start">
          <p className="ai-start-desc">
            {t('aiStartDesc')}
          </p>
          <button className="ai-ask-btn" onClick={handleStart} disabled={filteredSpots.length === 0}>
            {t('aiStartBtn')}
          </button>
        </div>
      )}

      {/* Chat messages */}
      {started && (
        <div className="ai-chat">
          <div className="ai-messages">
            {messages.filter((msg) => msg.content !== TRIGGER.content).map((msg, i) => (
              <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                <MarkdownText text={msg.content} />
              </div>
            ))}
            {loading && (
              <div className="ai-bubble ai-bubble--assistant">
                <span className="ai-typing"><span/><span/><span/></span>
              </div>
            )}
            {error && <p className="ai-error">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
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
