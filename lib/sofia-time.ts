/**
 * Sofia time: dates and times as staff read them, in Bulgaria's time zone
 * wherever the server or the device runs.
 */

const TIME_ZONE = "Europe/Sofia";

const DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME = new Intl.DateTimeFormat("bg-BG", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The Sofia calendar day of `date`, as "2026-11-04". */
export function dayOf(date: Date): string {
  return DAY.format(date);
}

/** Whether `date` falls on the Sofia calendar day before `now`'s. */
export function isDayBefore(date: Date, now: Date): boolean {
  const [year, month, day] = dayOf(now).split("-").map(Number);
  const before = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  return dayOf(date) === before;
}

/** The Sofia time of day, as "09:05". */
export function timeOfDay(date: Date): string {
  const parts = TIME.formatToParts(date);
  const part = (type: "hour" | "minute") => parts.find((p) => p.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}`;
}

/** The date, as "28 октомври", with the year ("31 декември 2025 г.") only when it isn't `now`'s. */
export function calendarDate(date: Date, now: Date): string {
  const sameYear = dayOf(date).slice(0, 4) === dayOf(now).slice(0, 4);
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/**
 * A short "when", as of `now`: "днес, 14:32", "вчера, 17:12", or the date,
 * with the year only when it isn't this year's.
 */
export function whenShort(date: Date, now: Date): string {
  if (dayOf(date) === dayOf(now)) return `днес, ${timeOfDay(date)}`;
  if (isDayBefore(date, now)) return `вчера, ${timeOfDay(date)}`;
  return calendarDate(date, now);
}
