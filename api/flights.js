const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

// Main international airports in Japan
const JAPAN_AIRPORTS = ['TYO', 'KIX', 'NGO', 'CTS', 'FUK'];

function duffelHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Duffel-Version': DUFFEL_VERSION,
    Accept: 'application/json',
  };
}

function normalizeOffer(o, origin, dest, returnDate) {
  return {
    id: o.id,
    price: parseFloat(o.total_amount),
    currency: o.total_currency,
    airline: o.owner?.name ?? '—',
    airlineCode: o.owner?.iata_code ?? '',
    airlineLogo: o.owner?.logo_symbol_url ?? null,
    stops: (o.slices?.[0]?.segments?.length ?? 1) - 1,
    duration: o.slices?.[0]?.duration ?? null,
    departure: o.slices?.[0]?.segments?.[0]?.departing_at ?? null,
    arrival: o.slices?.[0]?.segments?.at(-1)?.arriving_at ?? null,
    originCode: o.slices?.[0]?.segments?.[0]?.origin?.iata_code ?? origin,
    destinationCode: o.slices?.[0]?.segments?.at(-1)?.destination?.iata_code ?? dest,
    returnDeparture: returnDate ? o.slices?.[1]?.segments?.[0]?.departing_at ?? null : null,
    returnArrival: returnDate ? o.slices?.[1]?.segments?.at(-1)?.arriving_at ?? null : null,
  };
}

async function searchOffers(apiKey, { origin, destination, date, returnDate, passengerList, cabinClass }) {
  const slices = [{ origin, destination, departure_date: date }];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });

  const res = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
    method: 'POST',
    headers: duffelHeaders(apiKey),
    body: JSON.stringify({
      data: { slices, passengers: passengerList, cabin_class: cabinClass },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? JSON.stringify(data));
  return (data?.data?.offers ?? []).map((o) => normalizeOffer(o, origin, destination, returnDate));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DUFFEL_API_KEY not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const { origin, destination = 'TYO', date, returnDate, passengers = 1, cabinClass = 'economy' } = body ?? {};

  if (!origin || !date) return res.status(400).json({ error: 'origin and date are required' });

  const passengerList = Array.from({ length: Number(passengers) }, () => ({ type: 'adult' }));
  const searchArgs = { origin, date, returnDate, passengerList, cabinClass };

  try {
    let allOffers;

    if (destination === 'JAPAN') {
      // Search top Japan airports in parallel, ignore individual failures
      const results = await Promise.allSettled(
        JAPAN_AIRPORTS.map((dest) => searchOffers(apiKey, { ...searchArgs, destination: dest }))
      );
      allOffers = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);
    } else {
      allOffers = await searchOffers(apiKey, { ...searchArgs, destination });
    }

    const top10 = allOffers
      .sort((a, b) => a.price - b.price)
      .slice(0, 10);

    return res.status(200).json({ offers: top10, total: allOffers.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
