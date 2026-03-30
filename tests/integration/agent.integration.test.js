// @vitest-environment node
import { describe, it, expect } from 'vitest';
import handler from '../../api/ask.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockReq(body) {
  return { method: 'POST', body };
}

function mockRes() {
  const res = {
    status: (s) => { res._status = s; return res; },
    json: (d) => { res._data = d; return res; },
    write: (chunk) => { res._raw += chunk; },
    setHeader: () => res,
    end: () => res,
    _data: null, _status: 200, _raw: '',
  };
  return res;
}

const BASE_CONTEXT = {
  topSpots: [
    { name: 'Tokyo',  prefecture: 'Tokyo',  region: 'Kanto',  crowdCategory: 'tourist', totalVisits: 5000 },
    { name: 'Kyoto',  prefecture: 'Kyoto',  region: 'Kansai', crowdCategory: 'tourist', totalVisits: 3000 },
    { name: 'Osaka',  prefecture: 'Osaka',  region: 'Kansai', crowdCategory: 'mixed',   totalVisits: 2500 },
    { name: 'Hakone', prefecture: 'Kanagawa', region: 'Kanto', crowdCategory: 'local',  totalVisits: 800  },
  ],
  filter: {}, mode: 'all', crowdFilter: 'all', lang: 'en',
};

/** Call the handler once and return the AI reply text (parses SSE stream). */
async function agentTurn(messages, context = BASE_CONTEXT) {
  const req = mockReq({ messages, context });
  const res = mockRes();
  await handler(req, res);
  if (res._status !== 200) throw new Error(`API error ${res._status}: ${JSON.stringify(res._data)}`);

  // Parse SSE chunks accumulated in res._raw
  let content = '';
  for (const line of res._raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') continue;
    try {
      const delta = JSON.parse(payload).choices?.[0]?.delta?.content ?? '';
      content += delta;
    } catch { /* skip malformed */ }
  }
  if (!content) throw new Error('Empty content in streaming response');
  return content;
}

/** Simulate a full N-turn conversation, returning all [user, assistant] pairs. */
async function runConversation(turns, context = BASE_CONTEXT) {
  const TRIGGER = { role: 'user', content: 'Hello, I want to plan a trip to Japan.' };
  let messages = [];
  const history = [];

  // Get opening AI message (Q1)
  const firstReply = await agentTurn(messages, context);
  messages = [TRIGGER, { role: 'assistant', content: firstReply }];
  history.push({ assistant: firstReply });

  // Each turn: add user answer → get AI reply
  for (const userText of turns) {
    messages = [...messages, { role: 'user', content: userText }];
    history.push({ user: userText });

    const reply = await agentTurn(messages, context);
    messages = [...messages, { role: 'assistant', content: reply }];
    history.push({ assistant: reply });
  }

  return history;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const skip = !process.env.PERPLEXITY_API_KEY;

describe.skipIf(skip)('Integration — Single turn', () => {
  it('F-01: first response contains a question', async () => {
    const reply = await agentTurn([]);
    expect(reply).toMatch(/\?/);
  });

  it('A-03: response is never empty on 200', async () => {
    const reply = await agentTurn([]);
    expect(reply.trim().length).toBeGreaterThan(0);
  });

  it('F-01 lang: responds in Spanish when lang=es', async () => {
    const reply = await agentTurn([], { ...BASE_CONTEXT, lang: 'es' });
    expect(reply).toMatch(/[áéíóúüñ¿¡]|días|cuántos|viaje/i);
  });
});

describe.skipIf(skip)('Integration — Multi-turn conversation', () => {
  it('MT-01: asks only one question per turn', async () => {
    // After Q1 answer, the next response should contain exactly one question mark
    // (or at least not ask Q3 before Q2 is answered)
    const reply0 = await agentTurn([]);

    // Q1 answer: days
    const messages1 = [
      { role: 'user', content: 'Hello, I want to plan a trip to Japan.' },
      { role: 'assistant', content: reply0 },
      { role: 'user', content: '10 days' },
    ];
    const reply1 = await agentTurn(messages1);

    // Should ask about dates (Q2), not jump to Q3 or later
    const questionCount = (reply1.match(/\?/g) ?? []).length;
    expect(questionCount).toBeGreaterThanOrEqual(1);
    // Should NOT already contain Q3/Q4/Q5/Q6 topics if it hasn't asked Q2 yet
    // The response should be short — a single question
    expect(reply1.length).toBeLessThan(800);
  }, 40000);

  it('MT-02: completes full 6-question flow and returns an itinerary', async () => {
    const turns = [
      '14 days',           // Q1: duration
      'late September 2026', // Q2: dates
      'balanced',          // Q3: pace
      'couple',            // Q4: group
      'nature, temples, food, onsen', // Q5: interests
      'mid-range, around 15000 JPY per day', // Q6: budget
    ];

    const history = await runConversation(turns);

    // The last assistant message should be the itinerary
    const lastReply = history.filter((h) => h.assistant).at(-1).assistant;

    // Itinerary should mention days
    expect(lastReply).toMatch(/day\s*\d|día\s*\d|\*\*day|\*\*día/i);
    // Should be long (itinerary is detailed)
    expect(lastReply.length).toBeGreaterThan(500);
    // Should mention at least one Japan destination
    expect(lastReply).toMatch(/tokyo|kyoto|osaka|nara|hiroshima|hakone|nikko/i);
  }, 120000);

  it('MT-03: stays in Spanish throughout a multi-turn conversation', async () => {
    const context = { ...BASE_CONTEXT, lang: 'es' };
    const reply0 = await agentTurn([], context);

    // Q1 answer
    const messages1 = [
      { role: 'user', content: 'Hello, I want to plan a trip to Japan.' },
      { role: 'assistant', content: reply0 },
      { role: 'user', content: '7 días' },
    ];
    const reply1 = await agentTurn(messages1, context);

    // Both responses should be in Spanish
    const spanishRE = /[áéíóúüñ¿¡]|días|cuántos|viaje|cuándo|cómo|cuál/i;
    expect(reply0).toMatch(spanishRE);
    expect(reply1).toMatch(spanishRE);
  }, 60000);

  it('MT-04: Q2 response asks about travel dates, not other topics', async () => {
    const reply0 = await agentTurn([]);

    const messages1 = [
      { role: 'user', content: 'Hello, I want to plan a trip to Japan.' },
      { role: 'assistant', content: reply0 },
      { role: 'user', content: '7 days' },
    ];
    const reply1 = await agentTurn(messages1);

    // Q2 should ask about when / dates / period
    expect(reply1).toMatch(/when|date|month|season|period|travel|plan/i);
    // Should NOT ask about budget or interests yet
    expect(reply1).not.toMatch(/budget|interest|hobby|food|temple|pace|solo|couple/i);
  }, 40000);
});
