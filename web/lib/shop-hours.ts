const LOCALE = 'en-PH';

// Compares "HH:mm" strings in the shop's timezone; supports overnight hours.
export function isOpenNow(
  open: string,
  close: string,
  timeZone: string,
  now = new Date(),
) {
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return open <= close
    ? hhmm >= open && hhmm < close
    : hhmm >= open || hhmm < close;
}

export const formatTime = (hhmm: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`1970-01-01T${hhmm}:00Z`));

export const formatPeso = (centavos: number) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'PHP' }).format(
    centavos / 100,
  );
