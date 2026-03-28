// Japan tourist spots with monthly visit data (2019–2026)
// visits: estimated monthly visitors in thousands

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

// Seasonal multipliers (relative to annual average = 1.0)
// [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
const SPRING_HEAVY = [0.7, 0.75, 1.3, 1.6, 1.2, 0.9, 0.85, 0.9, 1.0, 1.2, 1.1, 0.85];
const AUTUMN_HEAVY = [0.7, 0.75, 1.0, 1.1, 1.0, 0.9, 0.9, 1.0, 1.05, 1.4, 1.5, 0.8];
const SUMMER_HEAVY = [0.6, 0.65, 0.85, 1.0, 1.1, 1.2, 1.5, 1.6, 1.1, 1.0, 0.85, 0.7];
const WINTER_HEAVY = [1.5, 1.4, 0.9, 0.8, 0.85, 0.7, 0.7, 0.8, 0.85, 1.0, 1.1, 1.6];
const BALANCED    = [0.85, 0.85, 1.1, 1.2, 1.1, 0.9, 0.95, 1.0, 1.0, 1.1, 1.1, 0.9];

// COVID impact multipliers per year (1.0 = normal)
const YEAR_FACTOR = {
  2019: 1.0,
  2020: 0.25,  // COVID hit hard
  2021: 0.3,
  2022: 0.55,
  2023: 0.85,
  2024: 1.0,
  2025: 1.05,
  2026: 0.5,   // Only partial year data
};

function generateVisits(baseMonthly, seasonality, variance = 0.08) {
  const result = {};
  for (const year of YEARS) {
    result[year] = {};
    const yearMult = YEAR_FACTOR[year];
    for (let month = 1; month <= 12; month++) {
      const seasonal = seasonality[month - 1];
      const noise = 1 + (Math.random() - 0.5) * variance;
      result[year][month] = Math.round(baseMonthly * seasonal * yearMult * noise);
    }
  }
  return result;
}

// Seed random for deterministic output
let seed = 42;
const seededRandom = () => {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return ((seed >>> 0) / 0xffffffff);
};
Math.random = seededRandom;

export const spots = [
  // ─── TOKYO ──────────────────────────────────────────
  {
    id: 'shinjuku',
    name: 'Shinjuku',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.6938, lng: 139.7034,
    visits: generateVisits(350, BALANCED),
  },
  {
    id: 'shibuya',
    name: 'Shibuya',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.6595, lng: 139.7004,
    visits: generateVisits(320, BALANCED),
  },
  {
    id: 'asakusa',
    name: 'Asakusa / Senso-ji',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.7148, lng: 139.7967,
    visits: generateVisits(290, SPRING_HEAVY),
  },
  {
    id: 'akihabara',
    name: 'Akihabara',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.7021, lng: 139.7741,
    visits: generateVisits(180, BALANCED),
  },
  {
    id: 'harajuku',
    name: 'Harajuku / Meiji Jingu',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.6763, lng: 139.6993,
    visits: generateVisits(240, SPRING_HEAVY),
  },
  {
    id: 'disneyland',
    name: 'Tokyo Disneyland',
    region: 'Kanto',
    prefecture: 'Chiba',
    lat: 35.6329, lng: 139.8804,
    visits: generateVisits(270, SUMMER_HEAVY),
  },
  {
    id: 'ueno',
    name: 'Ueno Park',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.7141, lng: 139.7774,
    visits: generateVisits(200, SPRING_HEAVY),
  },
  {
    id: 'odaiba',
    name: 'Odaiba',
    region: 'Kanto',
    prefecture: 'Tokyo',
    lat: 35.6268, lng: 139.7765,
    visits: generateVisits(160, SUMMER_HEAVY),
  },
  // ─── KANTO SURROUNDING ───────────────────────────────
  {
    id: 'nikko',
    name: 'Nikko',
    region: 'Kanto',
    prefecture: 'Tochigi',
    lat: 36.7548, lng: 139.6196,
    visits: generateVisits(120, AUTUMN_HEAVY),
  },
  {
    id: 'hakone',
    name: 'Hakone',
    region: 'Kanto',
    prefecture: 'Kanagawa',
    lat: 35.2324, lng: 139.1069,
    visits: generateVisits(150, AUTUMN_HEAVY),
  },
  {
    id: 'kamakura',
    name: 'Kamakura',
    region: 'Kanto',
    prefecture: 'Kanagawa',
    lat: 35.3192, lng: 139.5467,
    visits: generateVisits(130, SPRING_HEAVY),
  },
  {
    id: 'yokohama',
    name: 'Yokohama Chinatown',
    region: 'Kanto',
    prefecture: 'Kanagawa',
    lat: 35.4437, lng: 139.6476,
    visits: generateVisits(170, BALANCED),
  },
  {
    id: 'mt_fuji',
    name: 'Mt. Fuji / Kawaguchiko',
    region: 'Chubu',
    prefecture: 'Yamanashi',
    lat: 35.3606, lng: 138.7274,
    visits: generateVisits(200, SUMMER_HEAVY),
  },
  // ─── KYOTO ───────────────────────────────────────────
  {
    id: 'fushimi_inari',
    name: 'Fushimi Inari Taisha',
    region: 'Kansai',
    prefecture: 'Kyoto',
    lat: 34.9671, lng: 135.7727,
    visits: generateVisits(280, SPRING_HEAVY),
  },
  {
    id: 'kinkakuji',
    name: 'Kinkaku-ji (Golden Pavilion)',
    region: 'Kansai',
    prefecture: 'Kyoto',
    lat: 35.0394, lng: 135.7292,
    visits: generateVisits(260, SPRING_HEAVY),
  },
  {
    id: 'arashiyama',
    name: 'Arashiyama Bamboo Grove',
    region: 'Kansai',
    prefecture: 'Kyoto',
    lat: 35.0094, lng: 135.6729,
    visits: generateVisits(220, AUTUMN_HEAVY),
  },
  {
    id: 'gion',
    name: 'Gion District',
    region: 'Kansai',
    prefecture: 'Kyoto',
    lat: 35.0038, lng: 135.7761,
    visits: generateVisits(230, BALANCED),
  },
  {
    id: 'kiyomizudera',
    name: 'Kiyomizu-dera',
    region: 'Kansai',
    prefecture: 'Kyoto',
    lat: 34.9948, lng: 135.7850,
    visits: generateVisits(240, SPRING_HEAVY),
  },
  // ─── NARA ─────────────────────────────────────────────
  {
    id: 'nara_park',
    name: 'Nara Park / Todai-ji',
    region: 'Kansai',
    prefecture: 'Nara',
    lat: 34.6851, lng: 135.8048,
    visits: generateVisits(180, SPRING_HEAVY),
  },
  // ─── OSAKA ───────────────────────────────────────────
  {
    id: 'dotonbori',
    name: 'Dotonbori',
    region: 'Kansai',
    prefecture: 'Osaka',
    lat: 34.6687, lng: 135.5013,
    visits: generateVisits(280, BALANCED),
  },
  {
    id: 'osaka_castle',
    name: 'Osaka Castle',
    region: 'Kansai',
    prefecture: 'Osaka',
    lat: 34.6873, lng: 135.5262,
    visits: generateVisits(200, SPRING_HEAVY),
  },
  {
    id: 'usj',
    name: 'Universal Studios Japan',
    region: 'Kansai',
    prefecture: 'Osaka',
    lat: 34.6654, lng: 135.4321,
    visits: generateVisits(220, SUMMER_HEAVY),
  },
  // ─── KOBE ─────────────────────────────────────────────
  {
    id: 'kobe',
    name: 'Kobe Harborland',
    region: 'Kansai',
    prefecture: 'Hyogo',
    lat: 34.6817, lng: 135.1900,
    visits: generateVisits(120, BALANCED),
  },
  // ─── HIROSHIMA ────────────────────────────────────────
  {
    id: 'hiroshima_peace',
    name: 'Hiroshima Peace Memorial',
    region: 'Chugoku',
    prefecture: 'Hiroshima',
    lat: 34.3955, lng: 132.4534,
    visits: generateVisits(140, BALANCED),
  },
  {
    id: 'miyajima',
    name: 'Miyajima / Itsukushima',
    region: 'Chugoku',
    prefecture: 'Hiroshima',
    lat: 34.2955, lng: 132.3197,
    visits: generateVisits(150, AUTUMN_HEAVY),
  },
  {
    id: 'himeji',
    name: 'Himeji Castle',
    region: 'Kansai',
    prefecture: 'Hyogo',
    lat: 34.8394, lng: 134.6939,
    visits: generateVisits(130, SPRING_HEAVY),
  },
  // ─── CHUBU ────────────────────────────────────────────
  {
    id: 'nagoya_castle',
    name: 'Nagoya Castle',
    region: 'Chubu',
    prefecture: 'Aichi',
    lat: 35.1853, lng: 136.8997,
    visits: generateVisits(110, SPRING_HEAVY),
  },
  {
    id: 'shirakawago',
    name: 'Shirakawa-go',
    region: 'Chubu',
    prefecture: 'Gifu',
    lat: 36.2571, lng: 136.9007,
    visits: generateVisits(90, WINTER_HEAVY),
  },
  {
    id: 'kanazawa',
    name: 'Kanazawa Kenroku-en',
    region: 'Chubu',
    prefecture: 'Ishikawa',
    lat: 36.5614, lng: 136.6562,
    visits: generateVisits(100, SPRING_HEAVY),
  },
  // ─── TOHOKU ───────────────────────────────────────────
  {
    id: 'matsushima',
    name: 'Matsushima',
    region: 'Tohoku',
    prefecture: 'Miyagi',
    lat: 38.3726, lng: 141.0674,
    visits: generateVisits(80, AUTUMN_HEAVY),
  },
  {
    id: 'sendai',
    name: 'Sendai Tanabata',
    region: 'Tohoku',
    prefecture: 'Miyagi',
    lat: 38.2682, lng: 140.8694,
    visits: generateVisits(70, SUMMER_HEAVY),
  },
  // ─── KYUSHU ───────────────────────────────────────────
  {
    id: 'fukuoka_canal',
    name: 'Fukuoka Canal City',
    region: 'Kyushu',
    prefecture: 'Fukuoka',
    lat: 33.5894, lng: 130.4133,
    visits: generateVisits(130, BALANCED),
  },
  {
    id: 'nagasaki',
    name: 'Nagasaki Glover Garden',
    region: 'Kyushu',
    prefecture: 'Nagasaki',
    lat: 32.7349, lng: 129.8680,
    visits: generateVisits(90, BALANCED),
  },
  {
    id: 'beppu',
    name: 'Beppu Hells',
    region: 'Kyushu',
    prefecture: 'Oita',
    lat: 33.2846, lng: 131.4914,
    visits: generateVisits(80, WINTER_HEAVY),
  },
  {
    id: 'yakushima',
    name: 'Yakushima Forest',
    region: 'Kyushu',
    prefecture: 'Kagoshima',
    lat: 30.3595, lng: 130.5506,
    visits: generateVisits(40, SUMMER_HEAVY),
  },
  // ─── OKINAWA ──────────────────────────────────────────
  {
    id: 'shuri_castle',
    name: 'Shuri Castle',
    region: 'Okinawa',
    prefecture: 'Okinawa',
    lat: 26.2172, lng: 127.7197,
    visits: generateVisits(110, SUMMER_HEAVY),
  },
  {
    id: 'churaumi',
    name: 'Churaumi Aquarium',
    region: 'Okinawa',
    prefecture: 'Okinawa',
    lat: 26.6936, lng: 127.8783,
    visits: generateVisits(130, SUMMER_HEAVY),
  },
  {
    id: 'kerama',
    name: 'Kerama Islands',
    region: 'Okinawa',
    prefecture: 'Okinawa',
    lat: 26.2125, lng: 127.3075,
    visits: generateVisits(60, SUMMER_HEAVY),
  },
  // ─── HOKKAIDO ─────────────────────────────────────────
  {
    id: 'sapporo',
    name: 'Sapporo Snow Festival',
    region: 'Hokkaido',
    prefecture: 'Hokkaido',
    lat: 43.0618, lng: 141.3545,
    visits: generateVisits(180, WINTER_HEAVY),
  },
  {
    id: 'otaru',
    name: 'Otaru Canal',
    region: 'Hokkaido',
    prefecture: 'Hokkaido',
    lat: 43.1907, lng: 140.9947,
    visits: generateVisits(100, WINTER_HEAVY),
  },
  {
    id: 'furano',
    name: 'Furano Lavender Fields',
    region: 'Hokkaido',
    prefecture: 'Hokkaido',
    lat: 43.3487, lng: 142.3833,
    visits: generateVisits(90, SUMMER_HEAVY),
  },
  {
    id: 'niseko',
    name: 'Niseko Ski Resort',
    region: 'Hokkaido',
    prefecture: 'Hokkaido',
    lat: 42.8053, lng: 140.6868,
    visits: generateVisits(70, WINTER_HEAVY),
  },
];

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const ALL_YEARS = YEARS;

export const REGIONS = [...new Set(spots.map((s) => s.region))].sort();

export function filterSpots(spots, { year, month, startDate, endDate }) {
  // Returns [lat, lng, intensity] tuples for leaflet.heat
  const result = new Map(); // id -> total visits

  spots.forEach((spot) => {
    let total = 0;

    if (startDate && endDate) {
      // Custom date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (const y of ALL_YEARS) {
        for (let m = 1; m <= 12; m++) {
          const d = new Date(y, m - 1, 1);
          if (d >= start && d <= end) {
            total += spot.visits[y]?.[m] ?? 0;
          }
        }
      }
    } else if (year && month) {
      total = spot.visits[year]?.[month] ?? 0;
    } else if (year) {
      for (let m = 1; m <= 12; m++) {
        total += spot.visits[year]?.[m] ?? 0;
      }
    } else if (month) {
      for (const y of ALL_YEARS) {
        total += spot.visits[y]?.[month] ?? 0;
      }
    } else {
      for (const y of ALL_YEARS) {
        for (let m = 1; m <= 12; m++) {
          total += spot.visits[y]?.[m] ?? 0;
        }
      }
    }

    result.set(spot.id, total);
  });

  // Normalize intensities 0–1
  const values = [...result.values()];
  const max = Math.max(...values, 1);

  return spots.map((spot) => ({
    ...spot,
    totalVisits: result.get(spot.id),
    intensity: result.get(spot.id) / max,
  }));
}
