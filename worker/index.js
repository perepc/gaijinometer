/**
 * Gaijinometer AI Worker
 * Cloudflare Worker that proxies requests to Perplexity API.
 *
 * Deploy:
 *   cd worker
 *   npm install
 *   npx wrangler secret put PERPLEXITY_API_KEY   ← paste your key
 *   npx wrangler deploy
 *
 * After deploying, copy the worker URL (*.workers.dev) into the
 * "Configure" panel inside the app's AI tab.
 */

const ALLOWED_ORIGINS = [
  'https://perepc.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const SYSTEM_PROMPT = `You are a Japan travel expert for Gaijinometer, an app that visualises real tourism data.
Your job: give practical, specific travel recommendations based on the visitor data provided.
Rules:
- Be concise (200–300 words max).
- Use bullet points for spot recommendations.
- Always mention the best season/month to visit each spot.
- Highlight authentic, lesser-known alternatives when the crowd filter is "local" or "mixed".
- Do NOT repeat information already obvious from the data — add context, tips, and insider knowledge.`;

function buildUserPrompt({ topSpots, filter, mode, crowdFilter, question }) {
  const modeLabel = {
    international: 'international tourists only',
    domestic:      'domestic Japanese tourists only',
    all:           'all visitors (domestic + international)',
  }[mode] ?? 'all visitors';

  const crowdLabel = {
    local:   'Local Gems (<15% international)',
    mixed:   'Mixed (15–35% international)',
    tourist: 'Tourist Hotspots (>35% international)',
    all:     'all crowd types',
  }[crowdFilter] ?? 'all crowd types';

  const period = filter.startDate && filter.endDate
    ? `${filter.startDate} → ${filter.endDate}`
    : filter.year && filter.month ? `${filter.year} / month ${filter.month}`
    : filter.year  ? `full year ${filter.year}`
    : filter.month ? `month ${filter.month} across all years`
    : 'all available data (2019–2026)';

  const spotsText = topSpots.slice(0, 10)
    .map((s, i) =>
      `${i + 1}. ${s.name} (${s.prefecture}, ${s.region}) [${s.crowdCategory}] — ${s.totalVisits.toLocaleString()}k visitors`
    ).join('\n');

  const userQ = question?.trim()
    ? `User question: "${question.trim()}"`
    : 'Give travel recommendations and a suggested itinerary order based on this data. Prioritise hidden gems and authentic experiences.';

  return `Current Gaijinometer filters:
• Visitor type: ${modeLabel}
• Crowd profile: ${crowdLabel}
• Period: ${period}

Top destinations visible on the map:
${spotsText}

${userQ}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY secret not configured in Worker' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const pplxResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: buildUserPrompt(body) },
          ],
          max_tokens: 700,
          temperature: 0.7,
        }),
      });

      if (!pplxResponse.ok) {
        const errText = await pplxResponse.text();
        return new Response(
          JSON.stringify({ error: `Perplexity API error (${pplxResponse.status}): ${errText}` }),
          { status: pplxResponse.status, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      const data = await pplxResponse.json();
      return new Response(JSON.stringify(data), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Worker error: ${err.message}` }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
  },
};
