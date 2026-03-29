// @vitest-environment node
import { describe, it, expect } from 'vitest';
import handler from '../../api/ask.js';

function mockReq(body) {
  return { method: 'POST', body };
}

function mockRes() {
  let statusCode = 200;
  const res = {
    status: (s) => { statusCode = s; return res; },
    json: (d) => { res._data = d; res._status = statusCode; return res; },
    setHeader: () => res,
    end: () => res,
    _data: null,
    _status: 200,
  };
  return res;
}

const sampleContext = {
  topSpots: [
    {
      name: 'Tokyo',
      prefecture: 'Tokyo',
      region: 'Kanto',
      crowdCategory: 'tourist',
      totalVisits: 1000,
    },
  ],
  filter: {},
  mode: 'all',
  crowdFilter: 'all',
  lang: 'en',
};

describe.skipIf(!process.env.PERPLEXITY_API_KEY)('Integration — Real Perplexity API', () => {
  it('F-01: empty messages array → response is a non-empty string that asks a question', async () => {
    const req = mockReq({ messages: [], context: sampleContext });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    const content = res._data?.choices?.[0]?.message?.content;
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    // The first response should be a question
    expect(content).toMatch(/\?/);
  });

  it('A-03: response content is never empty string on success', async () => {
    const req = mockReq({ messages: [], context: sampleContext });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    const content = res._data?.choices?.[0]?.message?.content;
    expect(content).toBeTruthy();
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('F-01 lang: with lang:es in context, response is in Spanish', async () => {
    const spanishContext = { ...sampleContext, lang: 'es' };
    const req = mockReq({ messages: [], context: spanishContext });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    const content = res._data?.choices?.[0]?.message?.content;
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    // Response should contain Spanish characters or common Spanish words
    // The system prompt instructs the model to respond in Spanish
    const spanishIndicators = /[áéíóúüñ¿¡]|días|cuántos|viaje|planificar|España|tiene/i;
    expect(content).toMatch(spanishIndicators);
  });
});
