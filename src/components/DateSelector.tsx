import { useEffect, useId, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const months = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, index, 1)))
}));

function getParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return {
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) ? month : 0,
    day: Number.isFinite(day) ? day : 0
  };
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DateSelector({ value, onChange }: Props) {
  const id = useId();
  const [parts, setParts] = useState(() => getParts(value));
  const { year, month, day } = parts;
  useEffect(() => {
    if (value) setParts(getParts(value));
  }, [value]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => currentYear + index);
  const dayCount = year && month ? new Date(year, month, 0).getDate() : 31;

  const update = (part: 'year' | 'month' | 'day', rawValue: string) => {
    if (!rawValue) {
      setParts({ year: 0, month: 0, day: 0 });
      onChange('');
      return;
    }
    const next = { ...parts, [part]: Number(rawValue) || 0 };
    setParts(next);
    if (next.year && next.month && next.day) {
      next.day = Math.min(next.day, new Date(next.year, next.month, 0).getDate());
      onChange(toIsoDate(next.year, next.month, next.day));
    } else {
      onChange('');
    }
  };

  return <fieldset className="date-selector">
    <legend className="field-label">¿Qué día? (opcional)</legend>
    <div className="date-selector-fields">
      <div className="date-part">
        <label htmlFor={`${id}-day`}>Día</label>
        <select id={`${id}-day`} className="form-control" value={day || ''} onChange={event => update('day', event.target.value)}>
          <option value="">Día</option>
          {Array.from({ length: dayCount }, (_, index) => index + 1).map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div className="date-part">
        <label htmlFor={`${id}-month`}>Mes</label>
        <select id={`${id}-month`} className="form-control" value={month || ''} onChange={event => update('month', event.target.value)}>
          <option value="">Mes</option>
          {months.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="date-part">
        <label htmlFor={`${id}-year`}>Año</label>
        <select id={`${id}-year`} className="form-control" value={year || ''} onChange={event => update('year', event.target.value)}>
          <option value="">Año</option>
          {years.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    </div>
  </fieldset>;
}
