import {dateKey, formatDate, money, nightlyRate, offsetDays, todayOnCape} from './dates.js';

const endpoint = '/.netlify/functions/calendar?owner=1';
const login = document.querySelector('#owner-login');
const loginForm = document.querySelector('#login-form');
const dashboard = document.querySelector('#owner-tools');
const status = document.querySelector('#owner-status');
const settings = document.querySelector('#settings-form');
const blockForm = document.querySelector('#block-form');
const rateForm = document.querySelector('#rate-form');
const blockList = document.querySelector('#block-list');
const rateList = document.querySelector('#rate-list');
let key = '';
let schedule;
let version;
let busy = false;
let month = new Date(todayOnCape().slice(0, 7) + '-01T00:00:00Z');
const monthFormat = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'long', year: 'numeric'});
const previewLabel = document.querySelector('#owner-month-label');
const previewDays = document.querySelector('#owner-calendar-days');
const previewPrev = document.querySelector('#owner-month-prev');
const previewNext = document.querySelector('#owner-month-next');

function get(form, name) {
  return form.elements.namedItem(name);
}

async function request(method, payload) {
  const headers = {Authorization: `DuneKey ${encodeURIComponent(key)}`};
  if (payload) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(endpoint, {method, headers, cache: 'no-store', body: payload && JSON.stringify(payload)});
  } catch {
    throw new Error('The calendar server is unreachable. Try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.schedule) {
    throw new Error(data.error || 'The owner calendar is available on the production Netlify site.');
  }
  schedule = data.schedule;
  version = data.version;
}

function resetEdit(form, type) {
  form.reset();
  delete form.dataset.id;
  getEditControls(form, type, false);
}

function getEditControls(form, type, editing) {
  form.querySelector('[type="submit"]').textContent = `${editing ? 'Update' : 'Add'} ${type}`;
  form.querySelector('[data-cancel]').hidden = !editing;
}

function showForm(form, item, type) {
  form.dataset.id = item.id;
  get(form, 'start').value = item.start;
  get(form, 'end').value = item.end;
  if (type === 'date block') {
    get(form, 'kind').value = item.kind;
    get(form, 'note').value = item.note;
  } else {
    get(form, 'amount').value = item.amount / 100;
  }
  getEditControls(form, type, true);
  get(form, 'start').focus();
}

function rowButton(text, fn, name) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.className = 'button button-muted';
  button.setAttribute('aria-label', `${text} ${name}`);
  button.addEventListener('click', fn);
  return button;
}

function renderList(list, category, form, type) {
  list.replaceChildren();
  if (!schedule[category].length) {
    const item = document.createElement('li');
    item.textContent = `No ${category === 'blocks' ? 'blocked dates' : 'seasonal rates'} yet.`;
    list.append(item);
    return;
  }
  for (const entry of schedule[category]) {
    const item = document.createElement('li');
    const from = formatDate(entry.start);
    const to = formatDate(entry.end);
    const title = document.createElement('strong');
    title.textContent = category === 'blocks' ? (entry.kind === 'booked' ? 'Booked' : 'Owner hold') :
      `${money(entry.amount)} per night`;
    const dates = document.createElement('p');
    dates.textContent = category === 'blocks' ? `${from} to ${to} checkout` : `${from} through ${to}`;
    item.append(title, dates);
    if (entry.note) {
      const note = document.createElement('p');
      note.textContent = entry.note;
      item.append(note);
    }
    const controls = document.createElement('div');
    controls.className = 'actions';
    controls.append(
      rowButton('Edit', () => showForm(form, entry, type), `${type} starting ${from}`),
      rowButton('Delete', () => {
        if (busy || !window.confirm(`Delete the ${type} starting ${from}?`)) return;
        save({...schedule, [category]: schedule[category].filter(row => row.id !== entry.id)}, `Deleted ${type}.`, () => {
          if (form.dataset.id === entry.id) resetEdit(form, type);
        });
      }, `${type} starting ${from}`)
    );
    item.append(controls);
    list.append(item);
  }
}

function renderPreview() {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const offset = month.getUTCDay();
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const fragment = document.createDocumentFragment();
  previewLabel.textContent = monthFormat.format(month);
  previewPrev.disabled = year === 2000 && monthIndex === 0;
  previewNext.disabled = year === 2099 && monthIndex === 11;

  for (let i = 0; i < Math.ceil((offset + count) / 7) * 7; i++) {
    if (i % 7 === 0) fragment.append(document.createElement('tr'));
    const cell = document.createElement('td');
    fragment.lastElementChild.append(cell);
    const day = i - offset + 1;
    if (day < 1 || day > count) continue;
    const date = dateKey(new Date(Date.UTC(year, monthIndex, day)));
    const block = schedule.blocks.find(item => item.start <= date && date < item.end);
    const rate = nightlyRate(schedule, date);
    const label = document.createElement(block ? 'button' : 'span');
    label.className = block ? 'day blocked' : 'day';
    label.textContent = String(day);
    if (block) {
      label.type = 'button';
      label.setAttribute('aria-label', `Edit block for ${formatDate(date)}`);
      label.addEventListener('click', () => showForm(blockForm, block, 'date block'));
    }
    const detail = document.createElement('small');
    detail.textContent = block ? '×' : rate === null ? '—' :
      rate % 100 === 0 ? `$${rate / 100}` : money(rate);
    label.append(detail);
    cell.append(label);
  }
  previewDays.replaceChildren(fragment);
}

function moveMonth(delta) {
  month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1));
  renderPreview();
}

previewPrev.addEventListener('click', () => moveMonth(-1));
previewNext.addEventListener('click', () => moveMonth(1));

function render() {
  renderPreview();
  get(settings, 'base').value = schedule.base === null ? '' : schedule.base / 100;
  get(settings, 'published').checked = schedule.published;
  renderList(blockList, 'blocks', blockForm, 'date block');
  renderList(rateList, 'rates', rateForm, 'seasonal rate');
}

async function run(action, message) {
  if (busy) return;
  busy = true;
  status.textContent = 'Working…';
  try {
    await action();
    status.textContent = message;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
  }
}

function save(next, message, onSuccess) {
  return run(async () => {
    await request('PUT', {schedule: next, version});
    render();
    onSuccess?.();
  }, message);
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  key = get(loginForm, 'key').value;
  run(async () => {
    try {
      await request('GET');
    } catch (error) {
      key = '';
      throw error;
    }
    loginForm.reset();
    login.hidden = true;
    dashboard.hidden = false;
    render();
    get(settings, 'base').focus();
  }, 'Owner calendar loaded.');
});

document.querySelector('#owner-refresh').addEventListener('click', () => run(async () => {
  await request('GET');
  render();
  resetEdit(blockForm, 'date block');
  resetEdit(rateForm, 'seasonal rate');
}, 'Calendar reloaded.'));

document.querySelector('#owner-logout').addEventListener('click', () => {
  if (busy) return;
  key = '';
  schedule = undefined;
  version = undefined;
  settings.reset();
  resetEdit(blockForm, 'date block');
  resetEdit(rateForm, 'seasonal rate');
  blockList.replaceChildren();
  rateList.replaceChildren();
  dashboard.hidden = true;
  login.hidden = false;
  get(loginForm, 'key').focus();
  status.textContent = 'Signed out.';
});

settings.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const base = get(settings, 'base').value;
  const published = get(settings, 'published').checked;
  save({...schedule, base: base ? Math.round(Number(base) * 100) : null, published}, 'Calendar settings saved.');
});

function rangeValues(form) {
  return {
    id: form.dataset.id || crypto.randomUUID(),
    start: get(form, 'start').value,
    end: get(form, 'end').value
  };
}

blockForm.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const range = rangeValues(blockForm);
  if (range.start >= range.end) {
    status.textContent = 'Checkout must be after the first blocked night.';
    get(blockForm, 'end').focus();
    return;
  }
  const blocks = schedule.blocks.filter(item => item.id !== range.id);
  blocks.push({...range, kind: get(blockForm, 'kind').value, note: get(blockForm, 'note').value.trim()});
  save({...schedule, blocks}, 'Date block saved.', () => resetEdit(blockForm, 'date block'));
});

rateForm.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const range = rangeValues(rateForm);
  if (range.start > range.end) {
    status.textContent = 'The last night must be on or after the first night.';
    get(rateForm, 'end').focus();
    return;
  }
  const rates = [];
  for (const item of schedule.rates) {
    if (item.id === range.id) continue;
    if (item.end < range.start || item.start > range.end) {
      rates.push(item);
      continue;
    }
    if (item.start < range.start) rates.push({...item, id: crypto.randomUUID(), end: offsetDays(range.start, -1)});
    if (item.end > range.end) rates.push({...item, id: crypto.randomUUID(), start: offsetDays(range.end, 1)});
  }
  rates.push({...range, amount: Math.round(Number(get(rateForm, 'amount').value) * 100)});
  save({...schedule, rates}, 'Seasonal rate saved.', () => resetEdit(rateForm, 'seasonal rate'));
});

blockForm.querySelector('[data-cancel]').addEventListener('click', () => resetEdit(blockForm, 'date block'));
rateForm.querySelector('[data-cancel]').addEventListener('click', () => resetEdit(rateForm, 'seasonal rate'));
