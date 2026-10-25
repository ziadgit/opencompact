const SERIOUS = [
  /\bER\b/,
  /emergency/i,
  /hospital/i,
  /disfigure/i,
  /persistent rash/i,
  /alopecia/i,
  /hair (loss|shedding)/i,
  /eye injury/i,
  /conjunctivitis/i,
  /ophthalmolog/i,
];

export function isSeriousAdverseEvent(log: string): boolean {
  return SERIOUS.some((r) => r.test(log));
}

/** Add business days, skipping Saturdays and Sundays. Returns an ISO date. */
export function addBusinessDays(fromISO: string, days: number): string {
  const d = new Date(`${fromISO}T12:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Earliest ISO date found in the log, or today. MoCRA's clock starts when the report is received. */
export function firstEventDate(log: string): string {
  const dates = log.match(/\d{4}-\d{2}-\d{2}/g)?.sort();
  return dates?.[0] ?? new Date().toISOString().slice(0, 10);
}

export function mocraDueDate(log: string): string {
  return addBusinessDays(firstEventDate(log), 15);
}
