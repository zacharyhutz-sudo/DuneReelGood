import {calculateStay, dateKey, formatDate, isBlocked, isDate, money, nightlyRate, offsetDays, todayOnCape} from './dates.js';

const endpoint = '/.netlify/functions/calendar';
const today = todayOnCape();
const start = document.querySelector('#arrival');
const end = document.querySelector('#departure');
const calendar = document.querySelector('#calendar');
const calendarStatus = document.querySelector('#calendar-status');
const monthLabel = document.querySelector('#month-label');
const days = document.querySelector('#calendar-days');
const prev = document.querySelector('#month-prev');
const next = document.querySelector('#month-next');
const estimate = document.querySelector('#estimate');
const estimateField = document.querySelector('#submitted-estimate');
const form = document.querySelector('form[name="booking-inquiry"]');
const fields = document.querySelector('#inquiry-fields');
const formStatus = document.querySelector('#form-status');
const submit = form.querySelector('button[type="submit"]');
const monthFormat = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'long', year: 'numeric'});
const firstMonth = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
const lastMonth = shiftMonth(firstMonth, 24);
let month = firstMonth;
let schedule;

function shiftMonth(date, delta) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function drawCalendar(focusDate) {
  if (!schedule.published) return;
  monthLabel.textContent = monthFormat.format(month);
  prev.disabled = month <= firstMonth;
  next.disabled = month >= lastMonth;
  const offset = month.getUTCDay();
  const count = new Date(shiftMonth(month, 1).valueOf() - 86400000).getUTCDate();
  const selectingCheckout = Boolean(start.value && !end.value);
  const selectionValid = start.value && end.value && !calculateStay(schedule, start.value, end.value, today).error;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < Math.ceil((offset + count) / 7) * 7; i++) {
    if (i % 7 === 0) fragment.append(document.createElement('tr'));
    const cell = document.createElement('td');
    fragment.lastElementChild.append(cell);
    const day = i - offset + 1;
    if (day < 1 || day > count) continue;

    const date = dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day)));
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.date = date;
    button.className = 'day';
    button.textContent = String(day);
    const blocked = isBlocked(schedule, date);
    const past = date < today;
    const checkoutOnly = selectingCheckout && blocked && date > start.value &&
      !calculateStay(schedule, start.value, date, today).error;
    const selected = date === start.value || (selectionValid && start.value < date && date <= end.value);
    const rate = nightlyRate(schedule, date);

    button.disabled = past || (blocked && !checkoutOnly);
    if (selected) button.classList.add('selected');
    button.setAttribute('aria-pressed', Boolean(selected));
    if (blocked) button.classList.add('blocked');
    if (past) button.classList.add('past');
    const detail = past ? 'past date' : checkoutOnly ? 'checkout only' : blocked ? 'unavailable' :
      rate === null ? 'available, rate on request' : `available, ${money(rate)} per night`;
    button.setAttribute('aria-label', `${formatDate(date)}, ${detail}`);

    if (!blocked && !past && rate !== null) {
      const price = document.createElement('small');
      price.textContent = rate % 100 === 0 ? `$${rate / 100}` : money(rate);
      price.setAttribute('aria-hidden', 'true');
      button.append(price);
    }
    if (checkoutOnly) button.classList.add('checkout-only');
    button.addEventListener('click', () => pickDate(date));
    cell.append(button);
  }
  days.replaceChildren(fragment);
  if (focusDate) days.querySelector(`[data-date="${focusDate}"]`)?.focus();
}

function updateEstimate() {
  start.setCustomValidity('');
  end.setCustomValidity('');
  end.min = isDate(start.value) ? offsetDays(start.value, 1) : offsetDays(today, 1);
  estimateField.value = '';
  if (!start.value || !end.value) {
    estimate.textContent = start.value ? 'Choose a checkout date.' : 'Select both dates for a nightly-rate estimate.';
    return null;
  }
  const stay = calculateStay(schedule, start.value, end.value, today);
  if (stay.error) {
    end.setCustomValidity(stay.error);
    estimate.textContent = stay.error;
    return null;
  }
  const length = `${stay.nights} night${stay.nights === 1 ? '' : 's'}`;
  if (stay.total === null) estimate.textContent = `${length} · Rate confirmed by email.`;
  else {
    estimateField.value = money(stay.total);
    estimate.textContent = `${money(stay.total)} estimated lodging for ${length}. Taxes and fees are additional.`;
  }
  return stay;
}

function pickDate(date) {
  if (!start.value || end.value || date <= start.value) {
    start.value = date;
    end.value = '';
  } else {
    end.value = date;
  }
  updateEstimate();
  if (isBlocked(schedule, date)) {
    drawCalendar();
    end.focus();
  } else {
    drawCalendar(date);
  }
}

async function readCalendar() {
  const response = await fetch(endpoint, {cache: 'no-store'});
  if (!response.ok) throw new Error('Calendar service is unavailable.');
  const data = await response.json();
  if (!Array.isArray(data.blocks) || !Array.isArray(data.rates)) throw new Error('Invalid calendar.');
  return data;
}

async function init() {
  try {
    schedule = await readCalendar();
    start.min = today;
    end.min = offsetDays(today, 1);
    fields.disabled = false;
    calendar.hidden = !schedule.published;
    calendarStatus.textContent = schedule.published ? 'Select a check-in night, then a checkout date.' :
      'Online availability is awaiting an update. You can still inquire about your dates.';
    drawCalendar();
  } catch {
    calendarStatus.textContent = 'The online calendar is temporarily unavailable. Please refresh the page or try again later.';
  }
}

for (const field of [start, end]) {
  field.addEventListener('change', () => {
    updateEstimate();
    if (start.value) {
      const candidate = new Date(`${start.value.slice(0, 7)}-01T00:00:00Z`);
      if (candidate >= firstMonth && candidate <= lastMonth) month = candidate;
    }
    drawCalendar();
  });
}
prev.addEventListener('click', () => { month = shiftMonth(month, -1); drawCalendar(); });
next.addEventListener('click', () => { month = shiftMonth(month, 1); drawCalendar(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!schedule || submit.disabled) return;
  submit.disabled = true;
  formStatus.textContent = 'Checking your dates…';
  try {
    schedule = await readCalendar();
    calendar.hidden = !schedule.published;
    calendarStatus.textContent = schedule.published ? 'Select a check-in night, then a checkout date.' :
      'Online availability is awaiting an update. You can still inquire about your dates.';
    drawCalendar();
    if (!updateEstimate()) {
      formStatus.textContent = '';
      form.reportValidity();
      return;
    }
    formStatus.textContent = 'Sending your inquiry…';
    const response = await fetch('/', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(new FormData(form))
    });
    if (!response.ok) throw new Error('Could not submit inquiry.');
    window.location.assign(new URL('../success/', window.location.href));
  } catch {
    formStatus.textContent = 'Your inquiry could not be sent. Please try again.';
  } finally {
    submit.disabled = false;
  }
});

init();
