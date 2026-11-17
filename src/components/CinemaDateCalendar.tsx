import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const monthLabel = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekdayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const monthKey = (date: string) => date.slice(0, 7);

export function CinemaDateCalendar({ dates, selected, onSelect }: { dates: string[]; selected: string; onSelect: (date: string) => void }) {
  const months = useMemo(() => [...new Set(dates.map(monthKey))].sort(), [dates]);
  const [month, setMonth] = useState(() => monthKey(selected || dates[0] || ''));
  useEffect(() => { if (!months.includes(month)) setMonth(monthKey(selected || dates[0] || '')); }, [dates, selected, months, month]);
  const currentIndex = months.indexOf(month);
  const available = new Set(dates);
  if (!months.length) return <p>No hay fechas disponibles para esta función.</p>;
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return <div className="cinema-calendar" aria-label="Calendario de funciones disponibles">
    <div className="cinema-calendar-header">
      <button type="button" aria-label="Mes anterior" disabled={currentIndex <= 0} onClick={() => setMonth(months[currentIndex - 1])}><ChevronLeft size={22}/></button>
      <strong>{monthLabel.format(new Date(Date.UTC(year, monthNumber - 1, 1)))}</strong>
      <button type="button" aria-label="Mes siguiente" disabled={currentIndex >= months.length - 1} onClick={() => setMonth(months[currentIndex + 1])}><ChevronRight size={22}/></button>
    </div>
    <div className="cinema-calendar-grid">
      {weekdayLabels.map((label, index) => <span key={index} className="cinema-calendar-weekday" aria-hidden="true">{label}</span>)}
      {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} aria-hidden="true"/>)}
      {Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const value = `${month}-${String(day).padStart(2, '0')}`;
        const enabled = available.has(value);
        return <button key={value} type="button" disabled={!enabled} aria-label={`${day} de ${monthLabel.format(new Date(Date.UTC(year, monthNumber - 1, 1)))}`} aria-pressed={selected === value} className={`cinema-calendar-day${enabled ? ' has-showtime' : ''}${selected === value ? ' selected' : ''}`} onClick={() => onSelect(value)}>{day}</button>;
      })}
    </div>
    <p className="cinema-calendar-help"><span aria-hidden="true"/> Los días resaltados tienen funciones publicadas.</p>
  </div>;
}
