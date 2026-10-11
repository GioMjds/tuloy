import {
  ALLOWED_TRANSITIONS,
  BUSINESS_TZ,
  TicketStatus,
} from './queue.constants.js';

// YYYY-MM-DD in the business's local timezone
export function todayInTz(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

// A007, B012, etc. A=service index? For v0 keep it simple: single letter per business.
export function formatDisplayCode(number: number): string {
  const prefix = String.fromCharCode(
    65 + (Math.floor((number - 1) / 999) % 26),
  );
  const padded = String(((number - 1) % 999) + 1).padStart(3, '0');
  return `${prefix}${padded}`;
}

// Check if a transition from one status to another is valid, throw if not.
export function assertTransition(from: TicketStatus, to: TicketStatus) {
  const allowedTransitions = ALLOWED_TRANSITIONS[
    from
  ] as readonly TicketStatus[];
  if (!allowedTransitions.includes(to)) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}
