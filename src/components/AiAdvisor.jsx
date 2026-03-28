import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gaijinometer_worker_url';

function getStoredUrl() {
  try { return localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
}
function saveUrl(url) {
  try { localStorage.setItem(STORAGE_KEY, url); } catch {}
}

export default function AiAdvisor({ filteredSpots, filter, mode, crowdFilter }) {
  const [workerUrl, setWorkerUrl] = useState(getStoredUrl);
  const [urlDraft, setUrlDraft] = useState(getStoredUrl);
  const [configuring, setConfiguring] = useState(!getStoredUrl());
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);   // { text, citations }
  const [error, setError] = useState(null);

  const handleSaveUrl = () => {
    const trimmed = urlDraft.trim().replace(/\/$/, '');
    saveUrl(trimmed);
    setWorkerUrl(trimmed);
    setConfiguring(false);
  };

  const handleAsk = useCallback(async () => {
    if (!workerUrl) return;
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
      const res = await fetch(workerUrl, {
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
  }, [workerUrl, filteredSpots, filter, mode, crowdFilter, question]);

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
        <button className="ai-config-btn" title="Configure Worker URL" onClick={() => setConfiguring((v) => !v)}>
          ⚙️
        </button>
      </div>

      {configuring && (
        <div className="ai-config">
          <p className="ai-config-label">Cloudflare Worker URL</p>
          <p className="ai-config-hint">
            Deploy the worker in <code>worker/</code>, then paste its URL here. Stored locally.
          </p>
          <input
            className="ai-url-input"
            type="url"
            placeholder="https://gaijinometer-ai.your-name.workers.dev"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveUrl()}
          />
          <button className="ai-save-btn" onClick={handleSaveUrl} disabled={!urlDraft.trim()}>
            Save
          </button>
        </div>
      )}

      {!configuring && (
        <>
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
              disabled={loading || !workerUrl || filteredSpots.length === 0}
            >
              {loading ? <span className="ai-spinner" /> : '✨ Get Recommendations'}
            </button>
          </div>

          {error && <p className="ai-error">{error}</p>}

          {result && (
            <div className="ai-result">
              <div className="ai-result-text">
                {result.text.split('\n').map((line, i) => (
                  line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                ))}
              </div>
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

          {!workerUrl && (
            <p className="ai-no-url">
              Configure a Worker URL above to enable AI recommendations.
            </p>
          )}
        </>
      )}
    </div>
  );
}
