import { ALL_YEARS, MONTH_NAMES } from '../data/japanSpots';
import { useLang } from '../i18n.jsx';

export default function SpotInfo({ spot, filter, mode }) {
  const { t } = useLang();

  if (!spot) return (
    <div className="spot-info empty">
      <p>{t('clickMarker')}</p>
    </div>
  );

  const seriesKey = mode === 'international' ? 'intlVisits'
                  : mode === 'domestic'      ? 'domVisits'
                  : 'visits';
  const chartData = buildChartData(spot[seriesKey], filter);
  const maxVal = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="spot-info">
      <div className="spot-header">
        <div>
          <h2>{spot.name}</h2>
          <p className="spot-meta">{spot.prefecture} · {spot.region}</p>
        </div>
        <div className="spot-total">
          <span className="total-number">{spot.totalVisits.toLocaleString()}k</span>
          <span className="total-label">{t('visitors')}</span>
        </div>
      </div>

      <div className="chart-title">
        {chartData.length > 0 ? t('monthlyChart') : t('noData')}
      </div>

      <div className="bar-chart">
        {chartData.map((d) => (
          <div key={d.label} className="bar-col">
            <div
              className="bar"
              style={{ height: `${Math.max(4, (d.value / maxVal) * 100)}%` }}
              title={`${d.label}: ${d.value.toLocaleString()}k`}
            />
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
      {spot.source && (
        <p className="spot-source">📊 {spot.source}</p>
      )}
    </div>
  );
}

function buildChartData(series, filter) {
  if (filter.startDate && filter.endDate) {
    const items = [];
    const start = new Date(filter.startDate);
    const end = new Date(filter.endDate);
    for (const y of ALL_YEARS) {
      for (let m = 1; m <= 12; m++) {
        const d = new Date(y, m - 1, 1);
        if (d >= start && d <= end) {
          items.push({ label: `${MONTH_NAMES[m - 1]}'${String(y).slice(2)}`, value: series[y]?.[m] ?? 0 });
        }
      }
    }
    return items;
  }
  if (filter.year && filter.month) {
    return [{ label: `${MONTH_NAMES[filter.month - 1]} ${filter.year}`, value: series[filter.year]?.[filter.month] ?? 0 }];
  }
  if (filter.year) {
    return MONTH_NAMES.map((name, i) => ({ label: name, value: series[filter.year]?.[i + 1] ?? 0 }));
  }
  if (filter.month) {
    return ALL_YEARS.map((y) => ({ label: String(y), value: series[y]?.[filter.month] ?? 0 }));
  }
  return ALL_YEARS.map((y) => {
    const total = Object.values(series[y] ?? {}).reduce((a, b) => a + b, 0);
    return { label: String(y), value: total };
  });
}
