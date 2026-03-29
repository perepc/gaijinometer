function buildSystemPrompt(context) {
  const { topSpots, filter, mode, crowdFilter, lang } = context;
  const langInstruction = lang === 'es'
    ? 'IMPORTANT: Respond entirely in Spanish (Castilian). All text, headings, and bullet points must be in Spanish.'
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

### Flight search (triggered after question 2 only)
After the user answers question 2 and you have inferred approximate travel dates, ask:
"Would you like me to search for flights for that period?"
- If NO: continue with question 3.
- If YES: ask "Which city or airport will you depart from?"
  When the user answers with a city or airport name:
  - Resolve it to IATA code(s) using your knowledge.
  - If the city has exactly one main international airport, use it directly.
  - IMPORTANT: If the city has multiple airports, you MUST list ALL options and ask the user to choose. NEVER pick one automatically. Do NOT output the marker until the user has confirmed a single airport. Examples: Barcelona: BCN (only one). London: LHR (Heathrow), LGW (Gatwick), STN (Stansted), LCY (City). Paris: CDG (Charles de Gaulle), ORY (Orly). Madrid: MAD (only one). Tokyo (arrival): NRT (Narita), HND (Haneda). Osaka: KIX (Kansai). Same rule applies for the destination: if the user says "Tokyo", ask NRT or HND.
  Once the user has confirmed a single IATA code for both origin and destination, output EXACTLY the following on its own line with no other text on that line:
  [SEARCH_FLIGHTS:{"origin":"XXX","destination":"YYY","date":"YYYY-MM-DD","returnDate":"YYYY-MM-DD","passengers":1}]
  Where:
  - origin: the confirmed departure IATA code
  - destination: use "JAPAN" to search all major Japanese airports at once (NRT, HND, KIX, NGO, CTS, FUK) — use this when the user has not specified a particular airport or says "any airport" / "all airports". Otherwise use the specific confirmed IATA code (e.g. HND, NRT, KIX).
  - date: inferred departure date (first day of travel period)
  - returnDate: departure date + number of days from question 1
  - passengers: use answer from question 4 if already known, otherwise 1
  Then briefly confirm you are searching for flights to the chosen airport and continue with question 3.

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
