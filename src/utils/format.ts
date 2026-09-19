// Fuso fixo do app: formatação determinística, independente da máquina.
const APP_TIME_ZONE = "America/Sao_Paulo";

const zonedDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function readZonedParts(date: Date): ZonedParts {
  const bag: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of zonedDateTimeFormatter.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
  };
}

export function zonedParts(input: Date | string | number): ZonedParts {
  return readZonedParts(input instanceof Date ? input : new Date(input));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function zonedDateKey(input: Date | string | number): string {
  const parts = zonedParts(input);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function fromZonedParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const shown = readZonedParts(new Date(utc));
  const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0);
  return new Date(utc - (shownUtc - utc));
}

export function startOfZonedDay(input: Date | string | number): Date {
  const parts = zonedParts(input);
  return fromZonedParts(parts.year, parts.month, parts.day, 0, 0);
}

export function addZonedDays(input: Date | string | number, days: number): Date {
  const parts = zonedParts(input);
  const civil = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute, 0));
  return fromZonedParts(
    civil.getUTCFullYear(),
    civil.getUTCMonth() + 1,
    civil.getUTCDate(),
    parts.hour,
    parts.minute,
  );
}

export function addZonedMonths(input: Date | string | number, months: number): Date {
  const parts = zonedParts(input);
  const civil = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(civil.getUTCFullYear(), civil.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(parts.day, lastDay);
  return fromZonedParts(civil.getUTCFullYear(), civil.getUTCMonth() + 1, day, parts.hour, parts.minute);
}

export function startOfZonedWeek(input: Date | string | number): Date {
  const start = startOfZonedDay(input);
  const parts = zonedParts(start);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return addZonedDays(start, -weekday);
}

export function startOfZonedMonth(input: Date | string | number): Date {
  const parts = zonedParts(input);
  return fromZonedParts(parts.year, parts.month, 1, 0, 0);
}

export function weekDays(input: Date | string | number): Date[] {
  const start = startOfZonedWeek(input);
  return Array.from({ length: 7 }, (_, index) => addZonedDays(start, index));
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
}

export function monthCells(input: Date | string | number): MonthCell[] {
  const monthStart = startOfZonedMonth(input);
  const gridStart = startOfZonedWeek(monthStart);
  const month = zonedParts(monthStart).month;
  const year = zonedParts(monthStart).year;
  return Array.from({ length: 42 }, (_, index) => {
    const date = addZonedDays(gridStart, index);
    const parts = zonedParts(date);
    return { date, inMonth: parts.month === month && parts.year === year };
  });
}

export type AgendaView = "day" | "week" | "month";

export function agendaRange(view: AgendaView, anchor: Date | string | number): { start: Date; end: Date } {
  if (view === "day") {
    const start = startOfZonedDay(anchor);
    return { start, end: addZonedDays(start, 1) };
  }
  if (view === "week") {
    const start = startOfZonedWeek(anchor);
    return { start, end: addZonedDays(start, 7) };
  }
  const start = startOfZonedWeek(startOfZonedMonth(anchor));
  return { start, end: addZonedDays(start, 42) };
}

export function formatMonthTitle(input: Date | string | number): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(input instanceof Date ? input : new Date(input));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatWeekdayShort(input: Date | string | number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: APP_TIME_ZONE,
  })
    .format(input instanceof Date ? input : new Date(input))
    .replace(".", "")
    .toUpperCase();
}

export function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

export function formatTime(iso: string): string {
  const parts = zonedParts(iso);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function toDateTimeLocal(input: Date | string | number): string {
  const parts = zonedParts(input);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = fromZonedParts(year, month, day, 0, 0);
  const parts = zonedParts(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day) return null;
  return date;
}

export function slotDateTimeLocal(day: Date | string | number, hour: number, minute = 0): string {
  const parts = zonedParts(startOfZonedDay(day));
  return toDateTimeLocal(fromZonedParts(parts.year, parts.month, parts.day, hour, minute));
}

export function minutesFromZonedMidnight(input: Date | string | number): number {
  const parts = zonedParts(input);
  return parts.hour * 60 + parts.minute;
}

export function isSameZonedDay(a: Date | string | number, b: Date | string | number): boolean {
  return zonedDateKey(a) === zonedDateKey(b);
}

export function isZonedToday(input: Date | string | number): boolean {
  return isSameZonedDay(input, new Date());
}

export function eventEnd(startIso: string, durationMin: number): Date {
  return new Date(new Date(startIso).getTime() + durationMin * 60_000);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

interface AddressLike {
  street?: string;
  number?: string;
  complement?: string;
  city: string;
  state: string;
}

export function formatAddress(address: AddressLike | null | undefined): string {
  if (!address) return "";
  const logradouro = [address.street, address.number].filter(Boolean).join(", ");
  const local = [logradouro, address.complement].filter(Boolean).join(" — ");
  return local ? `${local} · ${address.city}/${address.state}` : `${address.city}/${address.state}`;
}
