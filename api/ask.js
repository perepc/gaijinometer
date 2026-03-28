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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured' });
  }

  const body = req.body;

  try {
    const pplxRes = await fetch('https://api.perplexity.ai/chat/completions', {
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

    const data = await pplxRes.json();

    if (!pplxRes.ok) {
      return res.status(pplxRes.status).json({ error: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
