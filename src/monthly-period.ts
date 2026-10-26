import { DateTime } from "luxon";

import { TIMEZONE } from "./types.js";

export interface MonthlyCyclePeriod {
  from: string;
  to: string;
  key: string;
}

/**
 * Completed payroll-style cycle ending on the 20th:
 * - On/after the 21st → previous month's 21st through this month's 20th
 * - Before the 21st → still that last completed cycle (month-before's 21st through last month's 20th)
 *
 * Example: 21 Oct → 21 Sep–20 Oct; 15 Oct → 21 Aug–20 Sep.
 */
export function targetMonthlyCyclePeriod(
  now = DateTime.now().setZone(TIMEZONE),
): MonthlyCyclePeriod {
  const zoned = now.setZone(TIMEZONE).startOf("day");
  let endMonth: DateTime;
  if (zoned.day >= 21) {
    endMonth = zoned;
  } else {
    endMonth = zoned.minus({ months: 1 });
  }
  const to = endMonth.set({ day: 20 }).toISODate()!;
  const from = endMonth.minus({ months: 1 }).set({ day: 21 }).toISODate()!;
  return { from, to, key: `${from}_${to}` };
}
