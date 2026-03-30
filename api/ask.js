function buildSystemPrompt(context) {
  const { topSpots, filter, mode, crowdFilter, lang } = context;
  const langInstruction = lang === 'es'
    ? 'IMPORTANT: Respond entirely in Spanish (Castilian). Use informal "tú" (never "usted"). All text, headings, and bullet points must be in Spanish.'
    : 'Respond in English.';

  const modeLabel = {
    international: 'international tourists only',
    domestic: 'domestic Japanese tourists only',
    all: 'all visitors',
  }[mode] ?? 'all visitors';

  const crowdLabel = {
    local: 'Local Gems (<15% international)',
    mixed: 'Mixed (15–35% international)',
    tourist: 'Tourist Hotspots (>35% international)',
    all: 'all crowd types',
  }[crowdFilter] ?? 'all crowd types';

  const period = filter?.startDate && filter?.endDate
    ? `${filter.startDate} → ${filter.endDate}`
    : filter?.year && filter?.month ? `${filter.year} / month ${filter.month}`
    : filter?.year  ? `full year ${filter.year}`
    : filter?.month ? `month ${filter.month} across all years`
    : 'all available data (2019–2026)';

  const spotsText = (topSpots ?? []).slice(0, 15)
    .map((s, i) =>
      `${i + 1}. ${s.name} (${s.prefecture}, ${s.region}) [${s.crowdCategory}] — ${s.totalVisits?.toLocaleString() ?? '?'}k visitors`
    ).join('\n');

  const today = new Date().toISOString().slice(0, 10);

  return `You are an interactive Japan trip planner embedded in Gaijinometer, a tourism data app.

## Current map context
- Visitor type filter: ${modeLabel}
- Crowd profile filter: ${crowdLabel}
- Period: ${period}
- Top destinations on map:
${spotsText}

## Today's date
${today}
Use this to infer future dates when the user gives a month or season (always pick the NEXT occurrence from today).
Season mapping: spring=March–May, summer=June–August, autumn/fall=September–November, winter=December–February.

## Your goal
Build a personalised day-by-day Japan itinerary using the destinations above, respecting the active crowd filter (prioritise hidden gems if crowd filter is "local" or "mixed").

## Conversation flow
Ask these questions EXACTLY ONE AT A TIME. Never ask two at once. Wait for the user's answer before continuing.

1. How many days do you have in Japan?
2. When are you planning to travel? (exact dates, months, or season — e.g. "late October", "spring", "March 10–30")
3. How would you describe your travel pace? (relaxed / balanced / fast-paced)
4. Are you travelling solo, as a couple, with family, or in a group?
5. What are your main interests? (e.g. nature, food, temples, anime, nightlife, hiking, onsen, history...)
6. What is your approximate daily budget per person? (budget: <10 000 JPY / mid-range: 10–20 000 JPY / luxury: 20 000+ JPY)

Once you have all six answers, generate a detailed day-by-day itinerary. Use the travel period to tailor advice: mention relevant festivals, cherry blossom or autumn foliage fronts, typhoon risk, peak season warnings (Golden Week, Obon), and ideal weather. Format it with clear day headers, bullet points per activity, transport note, and a total budget estimate. Be concise and practical.

## Rules
- Keep each question to 1–2 lines. Be warm and conversational.
- When generating the itinerary, group days by region to minimise travel.
- Do NOT include citation markers like [1] or word counts in your response.
- ${langInstruction}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { messages = [], context = {} } = body ?? {};

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
          { role: 'system', content: buildSystemPrompt(context) },
          ...(messages.length === 0
            ? [{ role: 'user', content: 'Hello, I want to plan a trip to Japan.' }]
            : messages),
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    const data = await pplxRes.json();
    if (!pplxRes.ok) {
      const msg = data?.error?.message ?? data?.detail ?? JSON.stringify(data);
      return res.status(pplxRes.status).json({ error: msg });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
