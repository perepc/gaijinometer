export default function TopList({ filteredSpots, selectedSpot, onSpotClick }) {
  const sorted = [...filteredSpots]
    .sort((a, b) => b.totalVisits - a.totalVisits)
    .slice(0, 10);

  const max = sorted[0]?.totalVisits || 1;

  return (
    <div className="top-list">
      <h3>Top 10 Destinations</h3>
      <ol>
        {sorted.map((spot, i) => (
          <li
            key={spot.id}
            className={`top-item ${selectedSpot?.id === spot.id ? 'active' : ''}`}
            onClick={() => onSpotClick(spot)}
          >
            <span className="rank">{i + 1}</span>
            <div className="top-item-body">
              <div className="top-item-header">
                <span className="top-name">{spot.name}</span>
                <span className="top-visits">{spot.totalVisits.toLocaleString()}k</span>
              </div>
              <div className="top-bar-bg">
                <div
                  className="top-bar-fill"
                  style={{ width: `${(spot.totalVisits / max) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
