// Datas de negócio do Vendix.
// O sistema opera no fuso America/Sao_Paulo e persiste instantes UTC no banco.
// "Data de competência" e "vencimento" são armazenados ao meio-dia local para
// evitar deslocamento de dia em qualquer fuso de exibição.

export const BUSINESS_TIMEZONE = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** Data de hoje (YYYY-MM-DD) no fuso de negócio. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentMonthISO(): string {
  return todayISO().slice(0, 7);
}

/** Converte "YYYY-MM-DD" em Date ao meio-dia de São Paulo. */
export function parseBusinessDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T12:00:00${OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseBusinessDateOrToday(value: string | null | undefined): Date {
  return parseBusinessDate(value) ?? new Date();
}

/** Início do dia (00:00) no fuso de negócio. */
export function startOfBusinessDay(value?: string | Date): Date {
  const iso = value instanceof Date ? toDateISO(value) : value ?? todayISO();
  return new Date(`${iso}T00:00:00${OFFSET}`);
}

/** Fim do dia (23:59:59.999) no fuso de negócio. */
export function endOfBusinessDay(value?: string | Date): Date {
  const iso = value instanceof Date ? toDateISO(value) : value ?? todayISO();
  return new Date(`${iso}T23:59:59.999${OFFSET}`);
}

/** Data (YYYY-MM-DD) de um instante no fuso de negócio. */
export function toDateISO(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function addMonths(value: Date, months: number): Date {
  const next = new Date(value);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Intervalo de um mês YYYY-MM em instantes UTC de início/fim. */
export function monthRange(monthISO?: string): { from: Date; to: Date; start: string; end: string } {
  const month = monthISO && /^\d{4}-\d{2}$/.test(monthISO) ? monthISO : currentMonthISO();
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from: startOfBusinessDay(start), to: endOfBusinessDay(end), start, end };
}

export function monthKey(value: Date | string): string {
  return toDateISO(value).slice(0, 7);
}

export function daysBetween(a: Date, b: Date): number {
  const diff = b.getTime() - a.getTime();
  return Math.floor(diff / 86_400_000);
}

export function isPast(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() < Date.now();
}

/** Lista de meses (YYYY-MM) entre dois limites, inclusive. */
export function monthsBetween(fromISO: string, toISO: string): string[] {
  const result: string[] = [];
  const [fy, fm] = fromISO.slice(0, 7).split("-").map(Number);
  const [ty, tm] = toISO.slice(0, 7).split("-").map(Number);
  let year = fy;
  let month = fm;
  while (year < ty || (year === ty && month <= tm)) {
    result.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export function brazilianPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function formatDocument(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value;
}
