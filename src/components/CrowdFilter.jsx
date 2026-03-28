import { CROWD_CATEGORIES } from '../data/japanSpots';
import { useLang } from '../i18n.jsx';

export default function CrowdFilter({ value, onChange }) {
  const { t } = useLang();

  const options = [
    { id: 'all', label: t('allSpots'), color: null },
    ...Object.entries(CROWD_CATEGORIES).map(([id, { color }]) => ({
      id,
      label: t(`cat${id.charAt(0).toUpperCase() + id.slice(1)}`),
      color,
    })),
  ];

  const crowdDescs = {
    local:   t('crowdDescLocal'),
    mixed:   t('crowdDescMixed'),
    tourist: t('crowdDescTourist'),
  };

  return (
    <div className="crowd-filter">
      <p className="crowd-filter-title">{t('crowdProfile')}</p>
      <div className="crowd-options">
        {options.map(({ id, label, color }) => (
          <button
            key={id}
            className={`crowd-btn ${value === id ? 'active' : ''}`}
            style={value === id && color ? { borderColor: color, color } : {}}
            onClick={() => onChange(id)}
          >
            {color && <span className="crowd-dot" style={{ background: color }} />}
            {label}
          </button>
        ))}
      </div>
      {value !== 'all' && (
        <p className="crowd-hint">{crowdDescs[value]}</p>
      )}
    </div>
  );
}
