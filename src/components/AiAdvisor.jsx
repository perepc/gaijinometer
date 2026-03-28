import { useState, useCallback } from 'react';

// Strip Perplexity citation markers like [1], [2], [1][2]
function stripCitations(text) {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\(\d+\s*palabras?\)/gi, '')
    .replace(/\(\d+\s*words?\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Render inline markdown: **bold**, *italic*
function renderInline(text) {
  const parts = [];
  // Split on **...** and *...* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownText({ text }) {
  const clean = stripCitations(text);
  const lines = clean.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(<ul key={key++}>{listItems}</ul>);
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.replace(/^[-•]\s*/, '');
      listItems.push(<li key={key++}>{renderInline(content)}</li>);
    } else {
      flushList();
      elements.push(<p key={key++}>{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div className="ai-result-text">{elements}</div>;
}

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAsk = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const topSpots = filteredSpots.slice(0, 10).map((s) => ({
      name: s.name,
      prefecture: s.prefecture,
      region: s.region,
      crowdCategory: s.crowdCategory,
      totalVisits: s.totalVisits,
    }));

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topSpots, filter, mode, crowdFilter, question }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      const text = data.choices?.[0]?.message?.content ?? '';
      const citations = data.citations ?? [];
      setResult({ text, citations });
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filteredSpots, filter, mode, crowdFilter, question]);

  const modeLabel = { all: 'All visitors', international: 'International only', domestic: 'Domestic only' }[mode];
  const crowdLabel = { all: 'All spots', local: 'Local Gems', mixed: 'Mixed', tourist: 'Tourist Hotspots' }[crowdFilter];

  return (
    <div className="ai-advisor">
      <div className="ai-header">
        <span className="ai-icon">🤖</span>
        <div>
          <p className="ai-title">AI Travel Advisor</p>
          <p className="ai-subtitle">Powered by Perplexity Sonar</p>
        </div>
      </div>

      <div className="ai-context">
        <p className="ai-context-title">Current context</p>
        <div className="ai-context-pills">
          <span className="ai-pill">{modeLabel}</span>
          <span className="ai-pill">{crowdLabel}</span>
          <span className="ai-pill">{filteredSpots.length} destinations</span>
        </div>
      </div>

      <div className="ai-question-area">
        <textarea
          className="ai-question-input"
          rows={3}
          placeholder="Ask anything… or leave blank for automatic recommendations based on your filters."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="ai-ask-btn"
          onClick={handleAsk}
          disabled={loading || filteredSpots.length === 0}
        >
          {loading ? <span className="ai-spinner" /> : '✨ Get Recommendations'}
        </button>
      </div>

      {error && <p className="ai-error">{error}</p>}

      {result && (
        <div className="ai-result">
          <MarkdownText text={result.text} />
          {result.citations.length > 0 && (
            <div className="ai-citations">
              <p className="ai-citations-title">Sources</p>
              <ol>
                {result.citations.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
