import { CROWD_CATEGORIES } from '../data/japanSpots';

const OPTIONS = [
  { id: 'all', label: 'All spots', color: null },
  ...Object.entries(CROWD_CATEGORIES).map(([id, { label, color }]) => ({ id, label, color })),
];

export default function CrowdFilter({ value, onChange }) {
  return (
    <div className="crowd-filter">
      <p className="crowd-filter-title">Crowd Profile</p>
      <div className="crowd-options">
        {OPTIONS.map(({ id, label, color }) => (
          <button
            key={id}
            className={`crowd-btn ${value === id ? 'active' : ''}`}
            style={value === id && color ? { borderColor: color, color } : {}}
            onClick={() => onChange(id)}
          >
            {color && (
              <span className="crowd-dot" style={{ background: color }} />
            )}
            {label}
          </button>
        ))}
      </div>
      {value !== 'all' && (
        <p className="crowd-hint">{CROWD_DESCRIPTIONS[value]}</p>
      )}
    </div>
  );
}

const CROWD_DESCRIPTIONS = {
  local:   'Under 15% international visitors — mostly Japanese tourists and residents.',
  mixed:   '15–35% international visitors — a balance of local and foreign travelers.',
  tourist: 'Over 35% international visitors — well-known on the global tourist circuit.',
};
