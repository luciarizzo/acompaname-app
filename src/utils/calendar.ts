import type { EventResult } from '../types';
export function downloadCalendarFile(event: EventResult) {
  if (!event.localDate || !event.localTime) return;
  const date = event.localDate.replace(/-/g, '');
  const time = event.localTime.replace(/:/g, '').slice(0, 6).padEnd(6, '0');
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const calendar = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Acompañame//Calendar//ES','BEGIN:VEVENT',`DTSTART:${date}T${time}`,`SUMMARY:${escape(event.name)}`,`LOCATION:${escape(event.venue)}`,`URL:${event.url}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'acompaname-evento.ics'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
