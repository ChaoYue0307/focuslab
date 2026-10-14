import { tr } from './i18n';
import type { Lang } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** An iCalendar file with a daily recurring reminder (works with Apple, Google and Outlook calendars). */
export function reminderIcs(time: string, url: string, lang: Lang): string {
  const [h, m] = time.split(':').map(Number);
  const start = new Date();
  start.setHours(h || 8, m || 0, 0, 0);
  if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1);
  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(start.getHours())}${pad(start.getMinutes())}00`;
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const summary = tr(lang, 'FocusLab · 15 分钟专注训练', 'FocusLab · 15-minute focus training');
  const desc = `${tr(lang, '打卡 → 今日训练 → 深度专注', 'Check in → today’s training → deep focus')}\\n${url}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FocusLab//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:focuslab-daily-${now.getTime()}@focuslab`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${local}`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function downloadReminder(time: string, lang: Lang) {
  const url = location.href.split('#')[0];
  const blob = new Blob([reminderIcs(time, url, lang)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'focuslab-daily-reminder.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
