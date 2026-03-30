import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    // Header
    subtitle:        'Japan Tourism Heatmap',
    modeAll:         '🌍 All',
    modeIntl:        '✈️ International',
    modeDom:         '🏠 Domestic',
    destinations:    'Destinations',
    totalVisitors:   'Total Visitors',
    // Sidebar tabs
    tabFilters:      '📅 Filters',
    tabRankings:     '🏆 Rankings',
    tabAI:           '🤖 AI',
    // Map legend
    legendLow:       'Low',
    legendHigh:      'High',
    sources:         'Sources:',
    // Crowd categories
    catLocal:        '🏘️ Local Gem',
    catMixed:        '⚖️ Mixed',
    catTourist:      '🌏 Tourist Hotspot',
    // DateFilter
    allTime:         'All Time',
    byYear:          'By Year',
    byMonth:         'By Month',
    yearMonth:       'Year + Month',
    customRange:     'Custom Range',
    allData:         'Showing all available data (2019–2026)',
    year:            'Year',
    month:           'Month',
    from:            'From',
    to:              'To',
    showing:         'Showing:',
    selectYear:      'Select year',
    selectMonth:     'Select month',
    yearLabel:       (y) => `Year ${y}`,
    allMonthsLabel:  (m) => `All ${m}s`,
    // CrowdFilter
    crowdProfile:    'Crowd Profile',
    allSpots:        'All spots',
    crowdDescLocal:  'Under 15% international visitors — mostly Japanese tourists and residents.',
    crowdDescMixed:  '15–35% international visitors — a balance of local and foreign travelers.',
    crowdDescTourist:'Over 35% international visitors — well-known on the global tourist circuit.',
    // TopList
    top10:           'Top 10 Destinations',
    // SpotInfo
    clickMarker:     'Click a marker on the map to see details',
    visitors:        'visitors',
    monthlyChart:    'Monthly visitors (thousands)',
    noData:          'No data for selected period',
    // AiAdvisor
    aiTitle:         'AI Trip Planner',
    aiSubtitle:      'Powered by Perplexity Sonar',
    aiContext:       'Active context',
    aiAllVisitors:   'All visitors',
    aiIntlOnly:      'International only',
    aiDomOnly:       'Domestic only',
    aiAllSpots:      'All spots',
    aiLocalGems:     'Local Gems',
    aiMixed:         'Mixed',
    aiTourist:       'Tourist Hotspots',
    aiDests:         'destinations',
    aiStartDesc:     "I'll ask you a few quick questions and build a personalised day-by-day Japan itinerary based on your current map filters.",
    aiStartBtn:      '✨ Start planning',
    aiPlaceholder:   'Type your answer…',
    aiNew:           '↺ New',
    sessionPickerTitle: 'Your trips',
    sessionNew:      'New trip',
    sessionResume:   (n) => `Resume a saved trip (${n})`,
    sessionWarnOld:  'This session is over a week old — some dates may have passed.',
    sessionWarnFilters: 'Map filters have changed since this session was saved.',
    // FlightSearch
    tabFlights:          '✈️ Flights',
    flightTitle:         'Cheapest Flights to Japan',
    flightSubtitle:      'Powered by Duffel — real-time fares',
    flightType_oneway:   'One way',
    flightType_return:   'Return',
    flightFrom:          'From (IATA)',
    flightTo:            'To',
    flightDepart:        'Departure',
    flightReturn:        'Return date',
    flightPassengers:    'Passengers',
    flightCabin:         'Cabin',
    flightSearchBtn:     'Search flights',
    flightResults:       (n, total) => `${n} cheapest of ${total} results`,
    flightPerPax:        'pax',
    flightDirect:        'Direct',
    flightStop:          (n) => n === 1 ? 'stop' : 'stops',
    flightReturnLabel:   'Return',
  },
  es: {
    // Header
    subtitle:        'Mapa de Calor del Turismo en Japón',
    modeAll:         '🌍 Total',
    modeIntl:        '✈️ Internacional',
    modeDom:         '🏠 Doméstico',
    destinations:    'Destinos',
    totalVisitors:   'Visitantes Totales',
    // Sidebar tabs
    tabFilters:      '📅 Filtros',
    tabRankings:     '🏆 Rankings',
    tabAI:           '🤖 IA',
    // Map legend
    legendLow:       'Bajo',
    legendHigh:      'Alto',
    sources:         'Fuentes:',
    // Crowd categories
    catLocal:        '🏘️ Joya Local',
    catMixed:        '⚖️ Mixto',
    catTourist:      '🌏 Hotspot Turístico',
    // DateFilter
    allTime:         'Todo',
    byYear:          'Por Año',
    byMonth:         'Por Mes',
    yearMonth:       'Año + Mes',
    customRange:     'Rango Custom',
    allData:         'Mostrando todos los datos disponibles (2019–2026)',
    year:            'Año',
    month:           'Mes',
    from:            'Desde',
    to:              'Hasta',
    showing:         'Mostrando:',
    selectYear:      'Selecciona año',
    selectMonth:     'Selecciona mes',
    yearLabel:       (y) => `Año ${y}`,
    allMonthsLabel:  (m) => `Todos los ${m}`,
    // CrowdFilter
    crowdProfile:    'Perfil de Afluencia',
    allSpots:        'Todos',
    crowdDescLocal:  'Menos del 15% de visitantes internacionales — principalmente turistas y residentes japoneses.',
    crowdDescMixed:  '15–35% de visitantes internacionales — equilibrio entre viajeros locales y extranjeros.',
    crowdDescTourist:'Más del 35% de visitantes internacionales — destino conocido en el circuito turístico global.',
    // TopList
    top10:           'Top 10 Destinos',
    // SpotInfo
    clickMarker:     'Toca un marcador en el mapa para ver detalles',
    visitors:        'visitantes',
    monthlyChart:    'Visitantes mensuales (miles)',
    noData:          'Sin datos para el período seleccionado',
    // AiAdvisor
    aiTitle:         'Planificador de Viaje IA',
    aiSubtitle:      'Desarrollado por Perplexity Sonar',
    aiContext:       'Contexto activo',
    aiAllVisitors:   'Todos los visitantes',
    aiIntlOnly:      'Solo internacionales',
    aiDomOnly:       'Solo domésticos',
    aiAllSpots:      'Todos los destinos',
    aiLocalGems:     'Joyas Locales',
    aiMixed:         'Mixto',
    aiTourist:       'Hotspots Turísticos',
    aiDests:         'destinos',
    aiStartDesc:     'Te haré unas preguntas rápidas y crearé un itinerario personalizado día a día para Japón según tus filtros actuales.',
    aiStartBtn:      '✨ Comenzar a planificar',
    aiPlaceholder:   'Escribe tu respuesta…',
    aiNew:           '↺ Nuevo',
    sessionPickerTitle: 'Tus viajes',
    sessionNew:      'Nuevo viaje',
    sessionResume:   (n) => `Retomar viaje guardado (${n})`,
    sessionWarnOld:  'Esta sesión tiene más de una semana — algunas fechas pueden haber pasado.',
    sessionWarnFilters: 'Los filtros del mapa han cambiado desde que se guardó esta sesión.',
    // FlightSearch
    tabFlights:          '✈️ Vuelos',
    flightTitle:         'Vuelos más baratos a Japón',
    flightSubtitle:      'Powered by Duffel — tarifas en tiempo real',
    flightType_oneway:   'Solo ida',
    flightType_return:   'Ida y vuelta',
    flightFrom:          'Origen (IATA)',
    flightTo:            'Destino',
    flightDepart:        'Salida',
    flightReturn:        'Vuelta',
    flightPassengers:    'Pasajeros',
    flightCabin:         'Cabina',
    flightSearchBtn:     'Buscar vuelos',
    flightResults:       (n, total) => `${n} más baratos de ${total} resultados`,
    flightPerPax:        'pax',
    flightDirect:        'Directo',
    flightStop:          (n) => n === 1 ? 'escala' : 'escalas',
    flightReturnLabel:   'Vuelta',
  },
};

function detectLang() {
  try {
    const stored = localStorage.getItem('gaijinometer_lang');
    if (stored && translations[stored]) return stored;
  } catch {}
  const browser = (navigator.language ?? 'en').slice(0, 2).toLowerCase();
  return translations[browser] ? browser : 'en';
}

export const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  function setLang(l) {
    setLangState(l);
    try { localStorage.setItem('gaijinometer_lang', l); } catch {}
  }

  const t = (key, ...args) => {
    const val = translations[lang]?.[key] ?? translations.en[key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
