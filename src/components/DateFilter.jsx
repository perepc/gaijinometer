import { useState } from 'react';
import { ALL_YEARS, MONTH_NAMES, FULL_MONTH_NAMES } from '../data/japanSpots';

const MODES = ['all', 'year', 'month', 'year-month', 'custom'];

export default function DateFilter({ filter, onChange }) {
  const [mode, setMode] = useState(
    filter.startDate ? 'custom'
    : (filter.year && filter.month) ? 'year-month'
    : filter.year ? 'year'
    : filter.month ? 'month'
    : 'all'
  );

  function handleModeChange(newMode) {
    setMode(newMode);
    // Reset filter on mode switch
    onChange({ year: null, month: null, startDate: null, endDate: null });
  }

  function handleYear(e) {
    const y = e.target.value ? Number(e.target.value) : null;
    onChange({ ...filter, year: y, startDate: null, endDate: null });
  }

  function handleMonth(e) {
    const m = e.target.value ? Number(e.target.value) : null;
    onChange({ ...filter, month: m, startDate: null, endDate: null });
  }

  function handleStartDate(e) {
    onChange({ year: null, month: null, startDate: e.target.value, endDate: filter.endDate });
  }

  function handleEndDate(e) {
    onChange({ year: null, month: null, startDate: filter.startDate, endDate: e.target.value });
  }

  return (
    <div className="date-filter">
      <div className="filter-modes">
        {[
          { id: 'all', label: 'All Time' },
          { id: 'year', label: 'By Year' },
          { id: 'month', label: 'By Month' },
          { id: 'year-month', label: 'Year + Month' },
          { id: 'custom', label: 'Custom Range' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`mode-btn ${mode === id ? 'active' : ''}`}
            onClick={() => handleModeChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-controls">
        {mode === 'all' && (
          <p className="filter-hint">Showing all available data (2019–2026)</p>
        )}

        {mode === 'year' && (
          <div className="select-group">
            <label>Year</label>
            <select value={filter.year ?? ''} onChange={handleYear}>
              <option value="">Select year</option>
              {ALL_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {mode === 'month' && (
          <div className="select-group">
            <label>Month</label>
            <select value={filter.month ?? ''} onChange={handleMonth}>
              <option value="">Select month</option>
              {FULL_MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {mode === 'year-month' && (
          <div className="select-row">
            <div className="select-group">
              <label>Year</label>
              <select value={filter.year ?? ''} onChange={handleYear}>
                <option value="">Select year</option>
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="select-group">
              <label>Month</label>
              <select value={filter.month ?? ''} onChange={handleMonth}>
                <option value="">Select month</option>
                {FULL_MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === 'custom' && (
          <div className="select-row">
            <div className="select-group">
              <label>From</label>
              <input
                type="month"
                min="2019-01"
                max="2026-12"
                value={filter.startDate ?? ''}
                onChange={handleStartDate}
              />
            </div>
            <div className="select-group">
              <label>To</label>
              <input
                type="month"
                min="2019-01"
                max="2026-12"
                value={filter.endDate ?? ''}
                onChange={handleEndDate}
              />
            </div>
          </div>
        )}
      </div>

      <FilterSummary filter={filter} mode={mode} />
    </div>
  );
}

function FilterSummary({ filter, mode }) {
  if (mode === 'all') return null;

  let text = '';
  if (filter.startDate && filter.endDate) {
    text = `${formatMonth(filter.startDate)} → ${formatMonth(filter.endDate)}`;
  } else if (filter.year && filter.month) {
    text = `${FULL_MONTH_NAMES[filter.month - 1]} ${filter.year}`;
  } else if (filter.year) {
    text = `Year ${filter.year}`;
  } else if (filter.month) {
    text = `All ${FULL_MONTH_NAMES[filter.month - 1]}s`;
  } else {
    return null;
  }

  return <p className="filter-summary">Showing: <strong>{text}</strong></p>;
}

function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}
