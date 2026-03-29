const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

function duffelHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Duffel-Version': DUFFEL_VERSION,
    Accept: 'application/json',
  };
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

  if (!origin || !date) {
    return res.status(400).json({ error: 'origin and date are required' });
  }

  const slices = [{ origin, destination, departure_date: date }];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });

  const passengerList = Array.from({ length: passengers }, () => ({ type: 'adult' }));

  try {
    // Create offer request with return_offers=true (single call)
    const offerRes = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
      method: 'POST',
      headers: duffelHeaders(apiKey),
      body: JSON.stringify({
        data: { slices, passengers: passengerList, cabin_class: cabinClass },
      }),
    });

    const offerData = await offerRes.json();

    if (!offerRes.ok) {
      const msg = offerData?.errors?.[0]?.message ?? JSON.stringify(offerData);
      return res.status(offerRes.status).json({ error: msg });
    }

    const offers = offerData?.data?.offers ?? [];

    // Sort by total price, take top 10
    const top10 = offers
      .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        price: parseFloat(o.total_amount),
        currency: o.total_currency,
        airline: o.owner?.name ?? '—',
        airlineCode: o.owner?.iata_code ?? '',
        airlineLogo: o.owner?.logo_symbol_url ?? null,
        stops: o.slices?.[0]?.segments?.length - 1 ?? 0,
        duration: o.slices?.[0]?.duration ?? null,
        departure: o.slices?.[0]?.segments?.[0]?.departing_at ?? null,
        arrival: o.slices?.[0]?.segments?.at(-1)?.arriving_at ?? null,
        originCode: o.slices?.[0]?.segments?.[0]?.origin?.iata_code ?? origin,
        destinationCode: o.slices?.[0]?.segments?.at(-1)?.destination?.iata_code ?? destination,
        returnDeparture: returnDate ? o.slices?.[1]?.segments?.[0]?.departing_at ?? null : null,
        returnArrival: returnDate ? o.slices?.[1]?.segments?.at(-1)?.arriving_at ?? null : null,
        bookingUrl: null, // Duffel requires booking through their SDK
      }));

    return res.status(200).json({ offers: top10, total: offers.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
