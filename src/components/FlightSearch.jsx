import { useState } from 'react';
import { useLang } from '../i18n.jsx';

const JAPAN_AIRPORTS = [
  { code: 'TYO', name: 'Tokyo (all)' },
  { code: 'NRT', name: 'Tokyo Narita' },
  { code: 'HND', name: 'Tokyo Haneda' },
  { code: 'KIX', name: 'Osaka Kansai' },
  { code: 'ITM', name: 'Osaka Itami' },
  { code: 'NGO', name: 'Nagoya' },
  { code: 'CTS', name: 'Sapporo' },
  { code: 'FUK', name: 'Fukuoka' },
  { code: 'OKA', name: 'Okinawa' },
];

const CABIN_CLASSES = [
  { value: 'economy',        label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business',       label: 'Business' },
  { value: 'first',          label: 'First' },
];

function formatDuration(iso) {
  if (!iso) return '—';
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || iso;
}

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FlightSearch() {
  const { t } = useLang();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('TYO');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState('oneway');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('economy');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);  // { offers, total }
  const [error, setError] = useState(null);

  async function handleSearch() {
    if (!origin.trim() || !date) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim().toUpperCase(),
          destination,
          date,
          returnDate: tripType === 'return' ? returnDate : undefined,
          passengers,
          cabinClass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flight-search">
      <div className="flight-header">
        <span className="flight-icon">✈️</span>
        <div>
          <p className="flight-title">{t('flightTitle')}</p>
          <p className="flight-subtitle">{t('flightSubtitle')}</p>
        </div>
      </div>

      {/* Trip type toggle */}
      <div className="flight-type-toggle">
        {['oneway', 'return'].map((type) => (
          <button
            key={type}
            className={`flight-type-btn ${tripType === type ? 'active' : ''}`}
            onClick={() => setTripType(type)}
          >
            {t(`flightType_${type}`)}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="flight-form">
        <div className="flight-row">
          <div className="flight-field">
            <label>{t('flightFrom')}</label>
            <input
              className="flight-input"
              type="text"
              placeholder="MAD, LHR, JFK…"
              maxLength={3}
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            />
          </div>
          <div className="flight-field">
            <label>{t('flightTo')}</label>
            <select className="flight-input" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {JAPAN_AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flight-row">
          <div className="flight-field">
            <label>{t('flightDepart')}</label>
            <input className="flight-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {tripType === 'return' && (
            <div className="flight-field">
              <label>{t('flightReturn')}</label>
              <input className="flight-input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={date} />
            </div>
          )}
        </div>

        <div className="flight-row">
          <div className="flight-field">
            <label>{t('flightPassengers')}</label>
            <select className="flight-input" value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flight-field">
            <label>{t('flightCabin')}</label>
            <select className="flight-input" value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
              {CABIN_CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <button
          className="flight-search-btn"
          onClick={handleSearch}
          disabled={loading || !origin.trim() || !date || (tripType === 'return' && !returnDate)}
        >
          {loading ? <span className="ai-spinner" /> : `🔍 ${t('flightSearchBtn')}`}
        </button>
      </div>

      {error && <p className="ai-error">{error}</p>}

      {results && (
        <div className="flight-results">
          <p className="flight-results-title">
            {t('flightResults', results.offers.length, results.total)}
          </p>
          {results.offers.map((offer) => (
            <div key={offer.id} className="flight-card">
              <div className="flight-card-top">
                <div className="flight-airline">
                  {offer.airlineLogo && (
                    <img src={offer.airlineLogo} alt={offer.airline} className="airline-logo" />
                  )}
                  <span>{offer.airline}</span>
                </div>
                <div className="flight-price">
                  <span className="price-amount">{offer.price.toLocaleString()} {offer.currency}</span>
                  <span className="price-pax">/ {t('flightPerPax')}</span>
                </div>
              </div>
              <div className="flight-card-route">
                <div className="flight-leg">
                  <span className="flight-time">{formatDateTime(offer.departure)}</span>
                  <span className="flight-code">{offer.originCode}</span>
                </div>
                <div className="flight-middle">
                  <span className="flight-duration">{formatDuration(offer.duration)}</span>
                  <div className="flight-line">
                    <div className="flight-line-inner" />
                  </div>
                  <span className="flight-stops">
                    {offer.stops === 0 ? t('flightDirect') : `${offer.stops} ${t('flightStop', offer.stops)}`}
                  </span>
                </div>
                <div className="flight-leg flight-leg--right">
                  <span className="flight-time">{formatDateTime(offer.arrival)}</span>
                  <span className="flight-code">{offer.destinationCode}</span>
                </div>
              </div>
              {offer.returnDeparture && (
                <div className="flight-card-route flight-card-route--return">
                  <div className="flight-leg">
                    <span className="flight-time">{formatDateTime(offer.returnDeparture)}</span>
                    <span className="flight-code">{offer.destinationCode}</span>
                  </div>
                  <div className="flight-middle">
                    <div className="flight-line"><div className="flight-line-inner" /></div>
                    <span className="flight-stops">{t('flightReturnLabel')}</span>
                  </div>
                  <div className="flight-leg flight-leg--right">
                    <span className="flight-time">{formatDateTime(offer.returnArrival)}</span>
                    <span className="flight-code">{offer.originCode}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
