const dayMs = 86400000;
const tz = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
});
const dateLabel = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', dateStyle: 'full'
});
const dollars = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});

export function todayOnCape(now = new Date()) {
  const parts = Object.fromEntries(tz.formatToParts(now).map(({type, value}) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function isDate(key) {
  if (typeof key !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && dateKey(date) === key;
}

export function offsetDays(key, count) {
  return dateKey(new Date(Date.parse(key) + count * dayMs));
}

export function formatDate(key) {
  return dateLabel.format(new Date(key));
}

export function money(cents) {
  return dollars.format(cents / 100);
}

export function nightlyRate(data, date) {
  return data.rates.find(rate => rate.start <= date && date <= rate.end)?.amount ?? data.base;
}

export function isBlocked(data, date) {
  return data.blocks.some(block => block.start <= date && date < block.end);
}

export function calculateStay(data, start, end, today) {
  if (!isDate(start) || !isDate(end)) return {error: 'Enter a check-in and checkout date.'};
  if (start < today) return {error: 'Choose a check-in date today or later.'};
  if (end <= start) return {error: 'Checkout must be after check-in.'};
  const nights = (Date.parse(end) - Date.parse(start)) / dayMs;
  if (nights > 365) return {error: 'For stays over 365 nights, contact Cape Escape.'};
  if (!data.published) return {nights, total: null};
  let total = 0;
  let complete = true;
  for (let night = start; night < end; night = offsetDays(night, 1)) {
    if (isBlocked(data, night)) return {error: 'One or more nights are unavailable. Try a different date range.'};
    const rate = nightlyRate(data, night);
    if (rate === null) complete = false;
    else total += rate;
  }
  return {nights, total: complete ? total : null};
}
