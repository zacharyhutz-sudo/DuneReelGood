import {createHash, timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {isDate} from '../../docs/assets/dates.js';

const fileKey = 'schedule-v1';
const empty = {published: false, base: null, blocks: [], rates: []};
const hash = value => createHash('sha256').update(value).digest();
const validId = id => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);
const validAmount = amount => Number.isInteger(amount) && amount >= 100 && amount <= 9999999;

function authorize(req, key) {
  const auth = req.headers.get('authorization') || '';
  return timingSafeEqual(hash(auth), hash(`Bearer ${key}`));
}

function json(body, status = 200) {
  return Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
}

function validSchedule(data) {
  if (!data || typeof data.published !== 'boolean' ||
      (data.base !== null && !validAmount(data.base)) ||
      !Array.isArray(data.blocks) || data.blocks.length > 500 ||
      !Array.isArray(data.rates) || data.rates.length > 500) return null;

  const validRange = entry => entry && validId(entry.id) && isDate(entry.start) && isDate(entry.end);
  if (!data.blocks.every(entry => validRange(entry) && entry.start < entry.end &&
      ['booked', 'blocked'].includes(entry.kind) && typeof entry.note === 'string' && entry.note.length <= 180)) return null;
  if (!data.rates.every(entry => validRange(entry) && entry.start <= entry.end && validAmount(entry.amount))) return null;
  for (const entries of [data.blocks, data.rates]) {
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) return null;
  }
  const rates = data.rates.map(({id, start, end, amount}) => ({id, start, end, amount}))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (rates.some((rate, index) => index > 0 && rates[index - 1].end >= rate.start)) return null;
  const blocks = data.blocks.map(({id, start, end, kind, note}) => ({id, start, end, kind, note}))
    .sort((a, b) => a.start.localeCompare(b.start));
  return {published: data.published, base: data.base, blocks, rates};
}

export function calendarHandler(getCalendarStore, ownerKey, allowOwnerEdits) {
  return async req => {
    const owner = new URL(req.url).searchParams.get('owner') === '1';
    if (!['GET', 'PUT'].includes(req.method)) {
      return new Response(null, {status: 405, headers: {Allow: 'GET, PUT'}});
    }
    if (req.method === 'PUT' && !owner) return json({error: 'Sign in to change the calendar.'}, 401);
    if (owner) {
      if (!allowOwnerEdits || !ownerKey || ownerKey.length < 32) {
        return json({error: 'The owner key is configured on the production Netlify deployment.'}, 503);
      }
      if (!authorize(req, ownerKey)) return json({error: 'The owner key did not match.'}, 401);
    }

    try {
      const store = getCalendarStore();
      if (req.method === 'GET') {
        const entry = await store.getWithMetadata(fileKey, {type: 'json'});
        const data = entry?.data ?? empty;
        if (owner) return json({schedule: data, version: entry?.etag ?? null});
        if (!data.published) return json(empty);
        const blocks = data.blocks.map(({start, end}) => ({start, end}));
        const rates = data.rates.map(({start, end, amount}) => ({start, end, amount}));
        return json({published: true, base: data.base, blocks, rates});
      }

      if (!req.headers.get('content-type')?.startsWith('application/json')) {
        return json({error: 'Send an application/json request.'}, 415);
      }
      const raw = await req.text();
      if (raw.length > 300000) return json({error: 'Calendar data is too large.'}, 413);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json({error: 'Invalid JSON.'}, 400);
      }
      const schedule = validSchedule(payload?.schedule);
      const version = payload?.version;
      if (!schedule || (version !== null && (typeof version !== 'string' || !version || version.length > 256))) {
        return json({error: 'Check entries for invalid dates, rates, or overlapping rate ranges.'}, 400);
      }
      const condition = version === null ? {onlyIfNew: true} : {onlyIfMatch: version};
      const result = await store.setJSON(fileKey, schedule, condition);
      if (!result.modified) return json({error: 'The calendar changed elsewhere. Reload it and try again.'}, 409);
      return json({schedule, version: result.etag});
    } catch (error) {
      console.error('Calendar storage request failed', error?.name);
      return json({error: 'Calendar storage is temporarily unavailable.'}, 503);
    }
  };
}

export default async (req, context) => {
  const production = context?.deploy?.context === 'production';
  const storeName = production ? 'dunereelgood-calendar' : 'dunereelgood-preview';
  const handler = calendarHandler(
    () => getStore({name: storeName, consistency: 'strong'}),
    process.env.DUNE_ADMIN_KEY,
    production
  );
  return handler(req);
};
