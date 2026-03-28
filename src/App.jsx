import { useState, useMemo, useCallback } from 'react';
import HeatMap from './components/HeatMap';
import DateFilter from './components/DateFilter';
import SpotInfo from './components/SpotInfo';
import TopList from './components/TopList';
import { spots, filterSpots, DATA_SOURCES } from './data/japanSpots';
import './App.css';

const INITIAL_FILTER = { year: null, month: null, startDate: null, endDate: null };

export default function App() {
  const [filter, setFilter] = useState(INITIAL_FILTER);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('filter');
  const [mode, setMode] = useState('all'); // 'all' | 'international' | 'domestic'

  const filteredSpots = useMemo(() => filterSpots(spots, filter, mode), [filter, mode]);

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
            <p className="subtitle">Japan Tourism Heatmap</p>
          </div>
        </div>
        <div className="mode-toggle">
          {[
            { id: 'all',           label: '🌍 Total' },
            { id: 'international', label: '✈️ Internacional' },
            { id: 'domestic',      label: '🏠 Doméstico' },
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
            <span className="stat-label">Destinations</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {totalVisitors >= 1000
                ? `${(totalVisitors / 1000).toFixed(1)}M`
                : `${totalVisitors.toLocaleString()}k`}
            </span>
            <span className="stat-label">Total Visitors</span>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${sidebarTab === 'filter' ? 'active' : ''}`}
              onClick={() => setSidebarTab('filter')}
            >
              📅 Filters
            </button>
            <button
              className={`tab-btn ${sidebarTab === 'top' ? 'active' : ''}`}
              onClick={() => setSidebarTab('top')}
            >
              🏆 Rankings
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'filter' && (
              <DateFilter filter={filter} onChange={setFilter} />
            )}
            {sidebarTab === 'top' && (
              <TopList
                filteredSpots={filteredSpots}
                selectedSpot={enrichedSelected}
                onSpotClick={handleSpotClick}
              />
            )}
          </div>

          <SpotInfo spot={enrichedSelected} filter={filter} mode={mode} />
        </aside>

        <main className="map-container">
          <HeatMap
            filteredSpots={filteredSpots}
            selectedSpot={enrichedSelected}
            onSpotClick={handleSpotClick}
          />
          <div className="map-legend">
            <span className="legend-label">Low</span>
            <div className="legend-gradient" />
            <span className="legend-label">High</span>
          </div>
          <div className="map-sources">
            <span className="sources-label">Sources:</span>
            {DATA_SOURCES.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
