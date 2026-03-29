import { useState, useMemo, useCallback } from 'react';
import HeatMap from './components/HeatMap';
import DateFilter from './components/DateFilter';
import CrowdFilter from './components/CrowdFilter';
import SpotInfo from './components/SpotInfo';
import TopList from './components/TopList';
import AiAdvisor from './components/AiAdvisor';
import FlightSearch from './components/FlightSearch';
import { spots, filterSpots, DATA_SOURCES, CROWD_CATEGORIES } from './data/japanSpots';
import { useLang } from './i18n.jsx';
import './App.css';

const INITIAL_FILTER = { year: null, month: null, startDate: null, endDate: null };

export default function App() {
  const { lang, setLang, t } = useLang();
  const [filter, setFilter] = useState(INITIAL_FILTER);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('filter');
  const [mode, setMode] = useState('all');
  const [crowdFilter, setCrowdFilter] = useState('all');

  const filteredSpots = useMemo(
    () => filterSpots(spots, filter, mode, crowdFilter),
    [filter, mode, crowdFilter]
  );

  const handleSpotClick = useCallback((spot) => {
    setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
  }, []);

  const enrichedSelected = selectedSpot
    ? filteredSpots.find((s) => s.id === selectedSpot.id) ?? null
    : null;

  const totalVisitors = filteredSpots.reduce((a, s) => a + s.totalVisits, 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">🗾</span>
          <div>
            <h1>Gaijinometer</h1>
            <p className="subtitle">{t('subtitle')}</p>
          </div>
        </div>
        <div className="mode-toggle">
          {[
            { id: 'all',           label: t('modeAll') },
            { id: 'international', label: t('modeIntl') },
            { id: 'domestic',      label: t('modeDom') },
          ].map(({ id, label }) => (
            <button
              key={id}
              className={`mode-toggle-btn ${mode === id ? 'active' : ''}`}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{filteredSpots.length}</span>
            <span className="stat-label">{t('destinations')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {totalVisitors >= 1000
                ? `${(totalVisitors / 1000).toFixed(1)}M`
                : `${totalVisitors.toLocaleString()}k`}
            </span>
            <span className="stat-label">{t('totalVisitors')}</span>
          </div>
          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          >
            {lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button className={`tab-btn ${sidebarTab === 'filter' ? 'active' : ''}`} onClick={() => setSidebarTab('filter')}>
              {t('tabFilters')}
            </button>
            <button className={`tab-btn ${sidebarTab === 'top' ? 'active' : ''}`} onClick={() => setSidebarTab('top')}>
              {t('tabRankings')}
            </button>
            <button className={`tab-btn ${sidebarTab === 'ai' ? 'active' : ''}`} onClick={() => setSidebarTab('ai')}>
              {t('tabAI')}
            </button>
            <button className={`tab-btn ${sidebarTab === 'flights' ? 'active' : ''}`} onClick={() => setSidebarTab('flights')}>
              {t('tabFlights')}
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'filter' && (
              <>
                <DateFilter filter={filter} onChange={setFilter} />
                <div className="sidebar-divider" />
                <CrowdFilter value={crowdFilter} onChange={setCrowdFilter} />
              </>
            )}
            {sidebarTab === 'top' && (
              <TopList
                filteredSpots={filteredSpots}
                selectedSpot={enrichedSelected}
                onSpotClick={handleSpotClick}
              />
            )}
            {sidebarTab === 'ai' && (
              <AiAdvisor
                filteredSpots={filteredSpots}
                filter={filter}
                mode={mode}
                crowdFilter={crowdFilter}
                lang={lang}
              />
            )}
            {sidebarTab === 'flights' && <FlightSearch />}
          </div>

          <SpotInfo spot={enrichedSelected} filter={filter} mode={mode} />
        </aside>

        <main className="map-container">
          <HeatMap
            filteredSpots={filteredSpots}
            selectedSpot={enrichedSelected}
            onSpotClick={handleSpotClick}
          />
          <div className="map-category-legend">
            {Object.entries(CROWD_CATEGORIES).map(([id, { color }]) => (
              <div key={id} className="cat-legend-item">
                <span className="cat-dot" style={{ background: color }} />
                {t(`cat${id.charAt(0).toUpperCase() + id.slice(1)}`)}
              </div>
            ))}
          </div>

          <div className="map-legend">
            <span className="legend-label">{t('legendLow')}</span>
            <div className="legend-gradient" />
            <span className="legend-label">{t('legendHigh')}</span>
          </div>
          <div className="map-sources">
            <span className="sources-label">{t('sources')}</span>
            {DATA_SOURCES.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
