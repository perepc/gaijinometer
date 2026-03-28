/**
 * Japan Tourism Data
 *
 * Sources:
 * - JNTO (Japan National Tourism Organization) — monthly inbound arrivals
 *   statistics.jnto.go.jp  |  tourism.jp/en/tourism-database/stats/inbound/
 * - TEA/AECOM — Theme Index: Global Attractions Attendance Report (theme parks)
 * - Japan Tourism Agency White Paper 2024 (mlit.go.jp)
 * - Individual attraction annual reports & academic estimates
 *
 * Annual visitor counts = domestic + international combined (estimated total).
 * Monthly breakdown = real JNTO seasonal curve × location-specific seasonal modifiers.
 */

// ─── REAL JNTO MONTHLY INBOUND DATA 2019 (thousands) ──────────────────────────
// Source: JNTO official monthly press releases
// Jan–Dec, Total = 31,882k
const JNTO_2019 = [2689, 2604, 2760, 2927, 2773, 2880, 2991, 2520, 2273, 2497, 2441, 2526];
const JNTO_2019_AVG = JNTO_2019.reduce((a, b) => a + b, 0) / 12; // ~2657k
// Normalized seasonal index per month (1.0 = monthly average)
const INTL_SEASONAL = JNTO_2019.map((v) => v / JNTO_2019_AVG);

// ─── REAL YEAR MULTIPLIERS ─────────────────────────────────────────────────────

// International tourists — Source: JNTO annual totals (2019 = 31.88M baseline)
// 2020: 4.12M | 2021: 0.25M | 2022: 3.83M | 2023: 25.07M | 2024: 36.87M
const INTL_YEAR = {
  2019: 1.000,
  2020: 0.129,
  2021: 0.008, // borders essentially closed
  2022: 0.120,
  2023: 0.787,
  2024: 1.157,
  2025: 1.253, // ~40M estimated, trend continuation
  2026: 0.320, // Q1 only (Jan–Mar 2026)
};

// Domestic tourists — Source: JTA domestic travel surveys + theme park attendance
// Disney Resort: 2019=32.5M → 2020=12.8M → 2021=12.5M → 2022=16.4M → 2023=31.4M
const DOM_YEAR = {
  2019: 1.000,
  2020: 0.420, // State of emergency declarations, voluntary travel restrictions
  2021: 0.420, // Repeated emergency periods throughout the year
  2022: 0.580, // Gradual lifting of restrictions from Oct 2022
  2023: 0.970, // Near-full recovery
  2024: 1.070, // Record inbound + domestic spending
  2025: 1.120, // Continued growth
  2026: 0.290, // Q1 only
};

// Domestic seasonal pattern (Golden Week Apr–May, Obon Aug, school holidays)
// [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
const DOM_SEASONAL = [0.84, 0.82, 0.96, 1.12, 1.26, 0.87, 1.08, 1.23, 0.94, 1.07, 1.00, 0.81];

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

// ─── SEASONAL PATTERNS ────────────────────────────────────────────────────────
// Monthly multipliers relative to uniform distribution.
// Values reflect combined domestic + international seasonality for that spot type.
// [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]

const P = {
  // Cherry blossom + autumn foliage (major Kyoto temples)
  KYOTO:    [0.70, 0.70, 1.55, 1.82, 1.05, 0.78, 0.75, 0.78, 0.88, 1.32, 1.28, 0.82],
  // Cherry blossom peak (Tokyo parks)
  CHERRY:   [0.72, 0.72, 1.68, 1.82, 1.06, 0.84, 0.84, 0.88, 0.92, 1.06, 1.06, 0.78],
  // General Tokyo urban (GW + slight summer + slight cherry)
  TOKYO:    [0.82, 0.80, 1.10, 1.24, 1.12, 0.90, 1.02, 1.02, 0.96, 1.06, 1.06, 0.90],
  // Autumn foliage primary (Nikko, Hakone, Miyajima)
  AUTUMN:   [0.72, 0.72, 0.90, 0.96, 1.00, 0.84, 0.90, 1.00, 1.04, 1.56, 1.52, 0.84],
  // Theme parks (school breaks: spring/summer/winter)
  THEME:    [0.74, 0.76, 1.26, 1.12, 1.10, 0.88, 1.36, 1.46, 0.88, 0.90, 0.82, 0.72],
  // Okinawa / beach (summer dominant)
  OKINAWA:  [0.52, 0.52, 0.72, 0.90, 1.10, 1.28, 1.86, 1.92, 1.30, 0.90, 0.58, 0.40],
  // Hokkaido ski / snow festival (winter dominant)
  SKI:      [1.80, 1.76, 0.98, 0.66, 0.66, 0.46, 0.58, 0.64, 0.68, 0.84, 0.96, 1.90],
  // Hokkaido summer (lavender, cool climate tourism)
  HOKKAIDO: [0.62, 0.62, 0.78, 0.88, 0.96, 1.06, 1.82, 1.90, 1.20, 0.96, 0.68, 0.52],
  // Onsen/hot spring resorts (slightly winter-heavy)
  ONSEN:    [1.20, 1.16, 0.96, 0.90, 0.92, 0.82, 0.88, 0.92, 0.90, 1.08, 1.10, 1.16],
  // Balanced year-round cultural sites
  BALANCED: [0.88, 0.86, 1.06, 1.14, 1.08, 0.90, 0.96, 0.98, 0.96, 1.08, 1.08, 0.98],
  // Furano-style summer flower tourism
  FLOWER:   [0.28, 0.28, 0.46, 0.60, 0.88, 1.18, 2.82, 2.54, 1.18, 0.68, 0.46, 0.34],
};

// ─── DATA GENERATION ──────────────────────────────────────────────────────────

/**
 * @param {number} annualVisitors2019  Total visitors 2019 (thousands)
 * @param {number} intlShare           Fraction who are international tourists (0–1)
 * @param {number[]} seasonality       12-element monthly pattern array
 */
function generateVisits(annualVisitors2019, intlShare, seasonality) {
  const intlAnnual = annualVisitors2019 * intlShare;
  const domAnnual  = annualVisitors2019 * (1 - intlShare);

  const total = {}, intl = {}, dom = {};

  for (const year of YEARS) {
    total[year] = {}; intl[year] = {}; dom[year] = {};

    for (let m = 1; m <= 12; m++) {
      if (year === 2026 && m > 3) {
        total[year][m] = 0; intl[year][m] = 0; dom[year][m] = 0;
        continue;
      }

      const localS  = seasonality[m - 1];
      const intlS   = INTL_SEASONAL[m - 1];
      const domS    = DOM_SEASONAL[m - 1];

      // International: JNTO real monthly curve blended with local pattern
      const intlSeasonal = intlS * 0.6 + localS * 0.4;
      const intlVal = Math.max(0, Math.round(
        (intlAnnual / 12) * intlSeasonal * INTL_YEAR[year]
      ));

      // Domestic: domestic seasonal curve blended with local pattern
      const domSeasonal = domS * 0.6 + localS * 0.4;
      const domVal = Math.max(0, Math.round(
        (domAnnual / 12) * domSeasonal * DOM_YEAR[year]
      ));

      intl[year][m]  = intlVal;
      dom[year][m]   = domVal;
      total[year][m] = intlVal + domVal;
    }
  }
  return { visits: total, intlVisits: intl, domVisits: dom, intlShare };
}

// ─── SPOT DEFINITIONS ────────────────────────────────────────────────────────
// annualVisitors2019: estimated total visitors (domestic + international) in 2019, thousands
// intlShare: fraction of international tourists (affects COVID year factors)
// Verified figures marked with ✓; others are estimates from available sources

export const spots = [
  // ── TOKYO ──────────────────────────────────────────────────────────────────
  {
    id: 'shinjuku', name: 'Shinjuku', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.6938, lng: 139.7034,
    // ~35M tourist visits/year to district (JTA Tokyo report)
    ...generateVisits(35000, 0.22, P.TOKYO),
    source: 'JTA Tokyo Tourism Report',
  },
  {
    id: 'shibuya', name: 'Shibuya Crossing', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.6595, lng: 139.7004,
    ...generateVisits(28000, 0.28, P.TOKYO),
    source: 'JTA Tokyo Tourism Report (estimate)',
  },
  {
    id: 'asakusa', name: 'Asakusa / Senso-ji', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.7148, lng: 139.7967,
    // ~30M/year ✓ (widely cited official figure)
    ...generateVisits(30000, 0.25, P.CHERRY),
    source: 'Taito City Tourism Report — ~30M visitors/year',
  },
  {
    id: 'akihabara', name: 'Akihabara', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.7021, lng: 139.7741,
    ...generateVisits(8000, 0.30, P.TOKYO),
    source: 'Estimate based on foot traffic surveys',
  },
  {
    id: 'harajuku', name: 'Harajuku / Meiji Jingu', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.6763, lng: 139.6993,
    // Meiji Shrine: ~10M/year ✓
    ...generateVisits(12000, 0.25, P.CHERRY),
    source: 'Meiji Shrine — ~10M visitors/year',
  },
  {
    id: 'disneyland', name: 'Tokyo Disney Resort', region: 'Kanto', prefecture: 'Chiba',
    lat: 35.6329, lng: 139.8804,
    // 2019: 32.5M combined (Disneyland + DisneySea) ✓ — TEA/AECOM Theme Index
    ...generateVisits(32500, 0.08, P.THEME),
    source: 'TEA/AECOM Theme Index 2019 — 32.5M combined',
  },
  {
    id: 'ueno', name: 'Ueno Park', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.7141, lng: 139.7774,
    ...generateVisits(10000, 0.20, P.CHERRY),
    source: 'Tokyo Metropolitan Government estimate',
  },
  {
    id: 'odaiba', name: 'Odaiba', region: 'Kanto', prefecture: 'Tokyo',
    lat: 35.6268, lng: 139.7765,
    ...generateVisits(5000, 0.18, P.TOKYO),
    source: 'Estimate based on major venue attendance',
  },

  // ── KANTO SURROUNDINGS ────────────────────────────────────────────────────
  {
    id: 'nikko', name: 'Nikko Tosho-gu', region: 'Kanto', prefecture: 'Tochigi',
    lat: 36.7548, lng: 139.6196,
    ...generateVisits(5000, 0.18, P.AUTUMN),
    source: 'Nikko City Tourism statistics (estimate)',
  },
  {
    id: 'hakone', name: 'Hakone', region: 'Kanto', prefecture: 'Kanagawa',
    lat: 35.2324, lng: 139.1069,
    // ~20M/year area visitors (Hakone Tourism Association reports)
    ...generateVisits(20000, 0.20, P.AUTUMN),
    source: 'Hakone Tourism Association — ~20M area visitors',
  },
  {
    id: 'kamakura', name: 'Kamakura', region: 'Kanto', prefecture: 'Kanagawa',
    lat: 35.3192, lng: 139.5467,
    ...generateVisits(20000, 0.18, P.CHERRY),
    source: 'Kamakura City Tourism — ~20M visitors/year',
  },
  {
    id: 'yokohama', name: 'Yokohama Chinatown', region: 'Kanto', prefecture: 'Kanagawa',
    lat: 35.4437, lng: 139.6476,
    ...generateVisits(18000, 0.18, P.BALANCED),
    source: 'Yokohama Tourism Bureau estimate',
  },
  {
    id: 'mt_fuji', name: 'Mt. Fuji / Kawaguchiko', region: 'Chubu', prefecture: 'Yamanashi',
    lat: 35.3606, lng: 138.7274,
    // Fuji Five Lakes area ~10M+ visitors/year
    ...generateVisits(10000, 0.28, P.CHERRY),
    source: 'Fuji Five Lakes Tourism estimate',
  },

  // ── KYOTO ─────────────────────────────────────────────────────────────────
  {
    id: 'fushimi_inari', name: 'Fushimi Inari Taisha', region: 'Kansai', prefecture: 'Kyoto',
    lat: 34.9671, lng: 135.7727,
    // 2.7M+ international visitors/year ✓, total ~5-6M
    ...generateVisits(5500, 0.45, P.KYOTO),
    source: 'JNTO / Kyoto City Tourism — 2.7M+ intl visitors',
  },
  {
    id: 'kinkakuji', name: 'Kinkaku-ji (Golden Pavilion)', region: 'Kansai', prefecture: 'Kyoto',
    lat: 35.0394, lng: 135.7292,
    ...generateVisits(5000, 0.42, P.KYOTO),
    source: 'Kyoto City Tourism Bureau estimate',
  },
  {
    id: 'arashiyama', name: 'Arashiyama Bamboo Grove', region: 'Kansai', prefecture: 'Kyoto',
    lat: 35.0094, lng: 135.6729,
    // 2M+ international ✓, total ~4M
    ...generateVisits(4000, 0.45, P.KYOTO),
    source: 'Kyoto City Tourism — 2M+ intl visitors/year',
  },
  {
    id: 'gion', name: 'Gion District', region: 'Kansai', prefecture: 'Kyoto',
    lat: 35.0038, lng: 135.7761,
    ...generateVisits(8000, 0.38, P.KYOTO),
    source: 'Kyoto City Tourism Bureau estimate',
  },
  {
    id: 'kiyomizudera', name: 'Kiyomizu-dera', region: 'Kansai', prefecture: 'Kyoto',
    lat: 34.9948, lng: 135.7850,
    ...generateVisits(5000, 0.40, P.KYOTO),
    source: 'Temple official records / Kyoto Tourism estimate',
  },

  // ── NARA ──────────────────────────────────────────────────────────────────
  {
    id: 'nara_park', name: 'Nara Park / Todai-ji', region: 'Kansai', prefecture: 'Nara',
    lat: 34.6851, lng: 135.8048,
    // Nara City: ~14M visitors/year; Todai-ji paid admissions ~1.4M
    ...generateVisits(14000, 0.22, P.CHERRY),
    source: 'Nara City Tourism — ~14M area visitors/year',
  },

  // ── OSAKA ─────────────────────────────────────────────────────────────────
  {
    id: 'dotonbori', name: 'Dotonbori', region: 'Kansai', prefecture: 'Osaka',
    lat: 34.6687, lng: 135.5013,
    ...generateVisits(18000, 0.32, P.BALANCED),
    source: 'Osaka Tourism Bureau estimate',
  },
  {
    id: 'osaka_castle', name: 'Osaka Castle', region: 'Kansai', prefecture: 'Osaka',
    lat: 34.6873, lng: 135.5262,
    // ~3M paid admissions/year
    ...generateVisits(3000, 0.30, P.CHERRY),
    source: 'Osaka Castle Museum admission records — ~3M/year',
  },
  {
    id: 'usj', name: 'Universal Studios Japan', region: 'Kansai', prefecture: 'Osaka',
    lat: 34.6654, lng: 135.4321,
    // 2019: ~14.5M ✓ — TEA/AECOM; 2023: ~16M ✓ (Nintendo World boost)
    ...generateVisits(14500, 0.12, P.THEME),
    source: 'TEA/AECOM Theme Index — 14.5M (2019), 16M (2023)',
  },

  // ── KOBE ──────────────────────────────────────────────────────────────────
  {
    id: 'kobe', name: 'Kobe Harborland', region: 'Kansai', prefecture: 'Hyogo',
    lat: 34.6817, lng: 135.1900,
    ...generateVisits(8000, 0.15, P.BALANCED),
    source: 'Kobe City Tourism estimate',
  },

  // ── CHUGOKU ───────────────────────────────────────────────────────────────
  {
    id: 'hiroshima_peace', name: 'Hiroshima Peace Memorial', region: 'Chugoku', prefecture: 'Hiroshima',
    lat: 34.3955, lng: 132.4534,
    // Peace Memorial Museum: ~1.77M visitors/year (paid)
    ...generateVisits(4000, 0.28, P.BALANCED),
    source: 'Peace Memorial Museum annual report — ~1.77M paid/year; area total ~4M',
  },
  {
    id: 'miyajima', name: 'Miyajima / Itsukushima Shrine', region: 'Chugoku', prefecture: 'Hiroshima',
    lat: 34.2955, lng: 132.3197,
    ...generateVisits(4000, 0.30, P.AUTUMN),
    source: 'Hiroshima Prefecture Tourism estimate — ~4M/year',
  },
  {
    id: 'himeji', name: 'Himeji Castle', region: 'Kansai', prefecture: 'Hyogo',
    lat: 34.8394, lng: 134.6939,
    // ~1.1M paid admissions/year
    ...generateVisits(1100, 0.22, P.CHERRY),
    source: 'Himeji Castle official records — ~1.1M/year',
  },

  // ── CHUBU ─────────────────────────────────────────────────────────────────
  {
    id: 'nagoya_castle', name: 'Nagoya Castle', region: 'Chubu', prefecture: 'Aichi',
    lat: 35.1853, lng: 136.8997,
    // ~2M visitors/year (Nagoya Castle + surrounding area)
    ...generateVisits(2000, 0.12, P.CHERRY),
    source: 'Nagoya City Tourism — ~2M visitors/year',
  },
  {
    id: 'shirakawago', name: 'Shirakawa-go', region: 'Chubu', prefecture: 'Gifu',
    lat: 36.2571, lng: 136.9007,
    // ~1.8M/year (UNESCO village — heavily visited)
    ...generateVisits(1800, 0.28, P.SKI),
    source: 'Shirakawa Village Tourism — ~1.8M/year',
  },
  {
    id: 'kanazawa', name: 'Kanazawa Kenroku-en', region: 'Chubu', prefecture: 'Ishikawa',
    lat: 36.5614, lng: 136.6562,
    // ~1.7M paid admissions + surrounding area ~7M city tourists
    ...generateVisits(1700, 0.18, P.CHERRY),
    source: 'Kenroku-en paid admissions — ~1.7M/year',
  },

  // ── TOHOKU ────────────────────────────────────────────────────────────────
  {
    id: 'matsushima', name: 'Matsushima Bay', region: 'Tohoku', prefecture: 'Miyagi',
    lat: 38.3726, lng: 141.0674,
    ...generateVisits(5000, 0.08, P.AUTUMN),
    source: 'Matsushima Tourism estimate — ~5M area visitors',
  },
  {
    id: 'sendai', name: 'Sendai (Tanabata / Zuihoden)', region: 'Tohoku', prefecture: 'Miyagi',
    lat: 38.2682, lng: 140.8694,
    ...generateVisits(3000, 0.06, P.BALANCED),
    source: 'Sendai City Tourism estimate',
  },

  // ── KYUSHU ────────────────────────────────────────────────────────────────
  {
    id: 'fukuoka', name: 'Fukuoka Canal City', region: 'Kyushu', prefecture: 'Fukuoka',
    lat: 33.5894, lng: 130.4133,
    // Canal City claims ~23M; more conservative tourist-specific estimate ~10M
    ...generateVisits(10000, 0.15, P.BALANCED),
    source: 'Canal City Hakata (conservative tourist estimate)',
  },
  {
    id: 'nagasaki', name: 'Nagasaki Glover Garden', region: 'Kyushu', prefecture: 'Nagasaki',
    lat: 32.7349, lng: 129.8680,
    // ~1.5M paid admissions
    ...generateVisits(1500, 0.15, P.BALANCED),
    source: 'Glover Garden attendance records — ~1.5M/year',
  },
  {
    id: 'beppu', name: 'Beppu Onsen / Hells', region: 'Kyushu', prefecture: 'Oita',
    lat: 33.2846, lng: 131.4914,
    ...generateVisits(1000, 0.12, P.ONSEN),
    source: 'Beppu City Tourism estimate',
  },
  {
    id: 'yakushima', name: 'Yakushima Forest', region: 'Kyushu', prefecture: 'Kagoshima',
    lat: 30.3595, lng: 130.5506,
    ...generateVisits(200, 0.15, P.FLOWER),
    source: 'Yakushima Tourist Association — ~200k/year',
  },

  // ── OKINAWA ───────────────────────────────────────────────────────────────
  {
    id: 'shuri_castle', name: 'Shuri Castle', region: 'Okinawa', prefecture: 'Okinawa',
    lat: 26.2172, lng: 127.7197,
    // Pre-fire (2018): ~900k paid; fire Oct 2019 → reduced. Using pre-fire figure
    ...generateVisits(900, 0.18, P.OKINAWA),
    source: 'Shuri Castle paid admissions — ~900k/year (pre-2019 fire)',
  },
  {
    id: 'churaumi', name: 'Churaumi Aquarium', region: 'Okinawa', prefecture: 'Okinawa',
    lat: 26.6936, lng: 127.8783,
    // ~1.3M paid admissions/year ✓
    ...generateVisits(1300, 0.15, P.OKINAWA),
    source: 'Okinawa Churaumi Aquarium — ~1.3M/year',
  },
  {
    id: 'kerama', name: 'Kerama Islands', region: 'Okinawa', prefecture: 'Okinawa',
    lat: 26.2125, lng: 127.3075,
    ...generateVisits(300, 0.20, P.OKINAWA),
    source: 'Zamami Village Tourism estimate',
  },

  // ── HOKKAIDO ──────────────────────────────────────────────────────────────
  {
    id: 'sapporo', name: 'Sapporo Snow Festival / Odori', region: 'Hokkaido', prefecture: 'Hokkaido',
    lat: 43.0618, lng: 141.3545,
    // Sapporo Snow Festival alone: ~2M visitors; city total ~15M
    ...generateVisits(15000, 0.22, P.SKI),
    source: 'Sapporo City Tourism — Snow Festival 2M/year; city 15M',
  },
  {
    id: 'otaru', name: 'Otaru Canal', region: 'Hokkaido', prefecture: 'Hokkaido',
    lat: 43.1907, lng: 140.9947,
    ...generateVisits(8000, 0.18, P.SKI),
    source: 'Otaru City Tourism estimate',
  },
  {
    id: 'furano', name: 'Furano Lavender Fields', region: 'Hokkaido', prefecture: 'Hokkaido',
    lat: 43.3487, lng: 142.3833,
    // Farm Tomita alone ~1.5M/year in summer; area ~3M
    ...generateVisits(3000, 0.22, P.FLOWER),
    source: 'Farm Tomita + Furano Tourism — ~3M summer visitors',
  },
  {
    id: 'niseko', name: 'Niseko Ski Resort', region: 'Hokkaido', prefecture: 'Hokkaido',
    lat: 42.8053, lng: 140.6868,
    // ~1M skier visits/year; ~40% international (famous among Australians/Asians)
    ...generateVisits(1000, 0.40, P.SKI),
    source: 'Niseko Tourism — ~1M skier visits, high intl share',
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const FULL_MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
export const ALL_YEARS = YEARS;
export const REGIONS = [...new Set(spots.map((s) => s.region))].sort();

// ─── CROWD CATEGORIES ─────────────────────────────────────────────────────────
// Based on intlShare (fraction of international tourists)
export const CROWD_CATEGORIES = {
  local:   { label: '🏘️ Local Gem',     color: '#4ade80', threshold: [0,    0.15] },
  mixed:   { label: '⚖️ Mixed',          color: '#facc15', threshold: [0.15, 0.35] },
  tourist: { label: '🌏 Tourist Hotspot', color: '#f87171', threshold: [0.35, 1]   },
};

export function getCrowdCategory(intlShare) {
  if (intlShare < 0.15) return 'local';
  if (intlShare < 0.35) return 'mixed';
  return 'tourist';
}

export const DATA_SOURCES = [
  { label: 'JNTO Monthly Arrivals', url: 'https://statistics.jnto.go.jp/en/graph/' },
  { label: 'TEA/AECOM Theme Index', url: 'https://teaconnect.org/resources/tea-aecom-theme-index/' },
  { label: 'JTA White Paper 2024', url: 'https://www.mlit.go.jp/kankocho/content/001767069.pdf' },
  { label: 'JTB Tourism Research', url: 'https://www.tourism.jp/en/tourism-database/stats/inbound/' },
];

// mode: 'all' | 'international' | 'domestic'
// crowdFilter: 'all' | 'local' | 'mixed' | 'tourist'
export function filterSpots(spots, { year, month, startDate, endDate }, mode = 'all', crowdFilter = 'all') {
  const seriesKey = mode === 'international' ? 'intlVisits'
                  : mode === 'domestic'      ? 'domVisits'
                  : 'visits';

  const activeSpots = crowdFilter === 'all'
    ? spots
    : spots.filter((s) => getCrowdCategory(s.intlShare) === crowdFilter);

  const result = new Map();

  activeSpots.forEach((spot) => {
    const series = spot[seriesKey];
    let total = 0;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (const y of ALL_YEARS) {
        for (let m = 1; m <= 12; m++) {
          const d = new Date(y, m - 1, 1);
          if (d >= start && d <= end) total += series[y]?.[m] ?? 0;
        }
      }
    } else if (year && month) {
      total = series[year]?.[month] ?? 0;
    } else if (year) {
      for (let m = 1; m <= 12; m++) total += series[year]?.[m] ?? 0;
    } else if (month) {
      for (const y of ALL_YEARS) total += series[y]?.[month] ?? 0;
    } else {
      for (const y of ALL_YEARS)
        for (let m = 1; m <= 12; m++) total += series[y]?.[m] ?? 0;
    }

    result.set(spot.id, total);
  });

  const values = [...result.values()];
  const max = Math.max(...values, 1);

  return activeSpots.map((spot) => ({
    ...spot,
    crowdCategory: getCrowdCategory(spot.intlShare),
    totalVisits: result.get(spot.id),
    intensity: result.get(spot.id) / max,
  }));
}
