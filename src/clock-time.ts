/**
 * One clock-time grammar for the whole app (regex tier, AI validators, resolveReportedTime).
 *
 * Accepted spellings (whole token):
 *   5   6   5pm   5 pm   5.45   6 45   6,45   6;45   6:45   6-45   6 : 45
 *   645   0645   1845   18.45   6.45pm   6:45 p.m.   18:45
 */

export type Meridiem = "am" | "pm";

export interface ParsedClock {
  /** 0-23 when no meridiem was written; 1-12 when a meridiem was written. */
  hour: number;
  minute: number;
  meridiem: Meridiem | null;
}

const MERIDIEM_SOURCE = String.raw`(?:a\.?m|p\.?m)`;

/**
 * Regex source with ONE capture group that finds a clock inside free text.
 * Order matters: minutes with separator, "6 45", compact 645/1845, then bare hour.
 */
export const CLOCK_CAPTURE_SOURCE = String.raw`(\d{1,2}\s*[:.,;]\s*\d{2}(?:\s*${MERIDIEM_SOURCE})?|\d{1,2}\s+\d{2}(?:\s*${MERIDIEM_SOURCE})?|\d{3,4}(?:\s*${MERIDIEM_SOURCE})?|\d{1,2}(?:\s*${MERIDIEM_SOURCE})?)`;

function readMeridiem(value: string): Meridiem | null {
  if (/p\.?m/i.test(value)) return "pm";
  if (/a\.?m/i.test(value)) return "am";
  return null;
}

/** Parse one clock token. Returns null when it is not a valid time. */
export function parseClock(raw: string): ParsedClock | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/^[\s@]+/, "")
    .replace(/^at\s+/, "")
    .replace(/[\s.]+$/, "")
    .trim();
  if (!cleaned) return null;

  const meridiem = readMeridiem(cleaned);
  const body = cleaned.replace(/\s*(?:a\.?m|p\.?m)\.?$/i, "").trim();

  let hourText: string;
  let minuteText: string;
  let match: RegExpMatchArray | null;
  if ((match = body.match(/^(\d{1,2})\s*[:.,;\-]\s*(\d{2})$/))) {
    hourText = match[1]!;
    minuteText = match[2]!;
  } else if ((match = body.match(/^(\d{1,2})\s+(\d{2})$/))) {
    hourText = match[1]!;
    minuteText = match[2]!;
  } else if ((match = body.match(/^(\d{1,2})(\d{2})$/))) {
    // Compact 645 / 0645 / 1845.
    hourText = match[1]!;
    minuteText = match[2]!;
  } else if ((match = body.match(/^(\d{1,2})$/))) {
    hourText = match[1]!;
    minuteText = "00";
  } else {
    return null;
  }

  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return { hour, minute, meridiem };
}

/** 24-hour hour for an explicit clock (meridiem or >12 / 0 means no ambiguity). */
export function explicitHour24(clock: ParsedClock): number | null {
  if (clock.meridiem === "am") return clock.hour % 12;
  if (clock.meridiem === "pm") return (clock.hour % 12) + 12;
  if (clock.hour === 0 || clock.hour > 12) return clock.hour;
  return null; // 1..12 with no meridiem is ambiguous
}

/** Canonical text for logging / prompts, e.g. "6:45 PM" or "18:45" or "6:45". */
export function formatClock(clock: ParsedClock): string {
  const mm = String(clock.minute).padStart(2, "0");
  if (clock.meridiem) return `${clock.hour}:${mm} ${clock.meridiem.toUpperCase()}`;
  return `${clock.hour}:${mm}`;
}

/** Every clock-looking token in free text (bare numbers included). */
export function findClockTokens(text: string): string[] {
  const pattern = new RegExp(CLOCK_CAPTURE_SOURCE, "gi");
  const found: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const token = match[1]?.trim();
    if (token) found.push(token);
  }
  return found;
}

/**
 * AI validator: a reported time is only believable if its digits are literally present
 * in the supplied text (12/24-hour equivalent; meridiem must agree when both are written).
 */
export function findTypedClock(reported: string, text: string): string | null {
  const wanted = parseClock(reported);
  if (!wanted) return null;
  const wantedHour12 = wanted.hour % 12;
  for (const token of findClockTokens(text)) {
    const found = parseClock(token);
    if (!found) continue;
    if (found.minute !== wanted.minute) continue;
    if (found.hour % 12 !== wantedHour12) continue;
    if (found.meridiem && wanted.meridiem && found.meridiem !== wanted.meridiem) continue;
    return token;
  }
  return null;
}

/**
 * Exactly what the employee typed. The AI may "helpfully" rewrite "9:10" as "09:10" or
 * "9:10 AM"; AM/PM must come from the typed token (or the shift), never from the model.
 */
export function clockAppearsInText(reported: string, text: string): boolean {
  return findTypedClock(reported, text) !== null;
}

/** True when the whole bubble is just a clock ("@9:10", "6.30", "at 6 45", "9:10 pm"). */
export function isClockOnlyText(text: string): boolean {
  const body = text
    .replace(/[\u00a0\u202f]/g, " ")
    .trim()
    .replace(/^(?:@\s*|at\s+)/i, "")
    .replace(/[.!\s]+$/, "");
  if (!body) return false;
  return parseClock(body) !== null;
}
