/* PackWise clickable prototype.
   Weather comes from Open-Meteo (live forecast, or last year's data for dates beyond the forecast
   window), with labeled estimates as an offline fallback. Packing recommendations are rule-based
   over data.js; itinerary import is rule-based parsing in importer.js. */

const root = document.getElementById('root');
const SCREENS = ['setup', 'plan', 'pack'];
const STEP_LABELS = ['Trip', 'Plan', 'Pack'];
const SLOT_ORDER = ['Top', 'Bottom', 'Footwear', 'Layer', 'Accessory'];
const LIST_ORDER = ['Clothing & footwear', 'Workouts', 'Activity gear', 'Food & water', 'Toiletries', 'Personal essentials', 'Electronics', 'Just in case'];
const SOURCE_LABEL = { forecast: 'Live forecast', typical: 'Typical for these dates', estimate: 'Estimate' };
const TIER_LABEL = { personal: 'Keep with you', carry: 'Carry-on', checked: 'Checked' };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME_COUNTRY = (navigator.language.split('-')[1] || 'US').toUpperCase();
const STORE = 'packwise-v6';

let uid = 0;
const newLeg = () => ({ id: 'L' + (++uid), activity: '', custom: '', destination: '', days: 1 });

const blankState = () => ({
  screen: 'home',
  reached: 0,
  start: '',
  legs: [newLeg()],
  workout: { days: 0, kind: 'gym' },
  lodging: ['hotel'],
  laundry: 'no',
  shopping: 'none',
  packing: 'balanced',
  bags: { backpack: 1 },
  avoid: '',
  rain: false,
  checked: {},
  finished: false,
  errors: {},
  wx: {},
  groupBy: 'bag',
  planTab: 'bags',
  packGroup: null,
  openBags: {},
  showWhy: false,
  importPreview: null,
});

let state = load() || blankState();
uid = Math.max(uid, ...state.legs.map(l => +l.id.slice(1)));

function load() {
  try { return JSON.parse(sessionStorage.getItem(STORE)); } catch { return null; }
}
const save = () => sessionStorage.setItem(STORE, JSON.stringify(state));

/* ---------- Helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ICONS.item}"/></svg>`;
const toFc = c => Math.round(c * 9 / 5 + 32);
const isLight = () => state.packing === 'light';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const safeId = s => s.replace(/[^a-z0-9]/gi, '');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const actOf = leg => ACTIVITIES[leg.activity] || ACTIVITIES.custom;
const actName = leg => leg.activity === 'custom' ? (leg.custom || 'Your activity') : actOf(leg).label;
const shortPlace = leg => leg.destination.split(',')[0].trim();
const legTitle = leg => `${actName(leg)} in ${shortPlace(leg)}`;

/* Dates (local, YYYY-MM-DD) */
const parseDate = iso => new Date(iso + 'T00:00');
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoDate(d); };
const fmt = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => parseDate(iso).toLocaleDateString('en-US', opts);
const todayIso = () => isoDate(new Date());
const totalDays = () => state.legs.reduce((s, l) => s + l.days, 0);
function legRange(i) {
  if (!state.start) return null;
  const offset = state.legs.slice(0, i).reduce((s, l) => s + l.days, 0);
  const start = addDays(state.start, offset);
  return { start, end: addDays(start, state.legs[i].days - 1) };
}
function rangeLabel(r) {
  if (!r) return 'Set a start date';
  return r.start === r.end ? fmt(r.start) : `${fmt(r.start, { month: 'short', day: 'numeric' })} – ${fmt(r.end, { month: 'short', day: 'numeric' })}`;
}

const avoidWords = () => state.avoid.toLowerCase().split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
const avoided = name => avoidWords().some(w => name.toLowerCase().includes(w));

// An item like "Daypack" is redundant when that bag is already on the bag list.
const coveredByBag = item => BAGS.some(b => b.kw && state.bags[b.id] > 0 && item.kw.some(k => b.kw.split(' ').includes(k)));

/* ---------- Weather ---------- */
const wxKey = (leg, i) => `${leg.destination.trim().toLowerCase()}|${legRange(i)?.start}|${leg.days}`;

// Falls back to the nearest stop with real weather, then to a generic default for the activity.
function weatherFor(leg, i) {
  const real = state.wx[wxKey(leg, i)];
  if (real) return real;
  const near = state.legs.map((l, j) => ({ d: Math.abs(j - i), w: state.wx[wxKey(l, j)] })).filter(x => x.w).sort((a, b) => a.d - b.d)[0];
  if (near) return { ...near.w, source: 'estimate', place: leg.destination, near: near.w.place };
  const c = actOf(leg).weather.temp;
  return { hi: toFc(c) + 5, lo: toFc(c) - 10, rain: 15, source: 'estimate', place: leg.destination };
}
const band = w => (w.lo < 45 || w.hi < 58) ? 'cold' : w.hi >= 82 ? 'hot' : 'mild';
const isWet = (leg, i) => state.rain || weatherFor(leg, i).rain >= 50;
const BAND_LABEL = { cold: 'Cold', mild: 'Mild', hot: 'Hot' };

async function getJSON(url, ms = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

// Resolves a free-text place. "Name, Hint" narrows by state/country; otherwise prefer the
// same state/country as the previous stop so "Yosemite" after "San Jose" stays in California.
async function geocode(q, prev) {
  const [name, ...rest] = q.split(',').map(s => s.trim());
  const hintRaw = rest.join(' ').trim();
  const hint = (US_STATES[hintRaw.toUpperCase()] || hintRaw).toLowerCase();
  const tries = [...new Set([name, name.split('/')[0].trim(), name.replace(/\b(national|state)\s+park\b|\b(park|beach|downtown|trailhead|trail)\b/gi, '').replace(/\s+/g, ' ').trim()])].filter(Boolean);
  for (const n of tries) {
    const res = (await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(n)}&count=10&language=en&format=json`)).results || [];
    if (!res.length) continue;
    if (hint) {
      const f = res.find(r => [r.admin1, r.country, r.admin2].some(x => x && x.toLowerCase().startsWith(hint)));
      if (f) return f;
    }
    if (prev) {
      const score = r => (r.admin1 === prev.admin1 ? 2 : 0) + (r.country_code === prev.country_code ? 1 : 0);
      return res.reduce((best, r) => score(r) > score(best) ? r : best, res[0]);
    }
    return res[0];
  }
  return null;
}

async function fetchWeather(leg, i, prevGeo) {
  const r = legRange(i);
  const geo = await geocode(leg.destination, prevGeo);
  if (!geo) return null;
  const place = [geo.name, geo.admin1 || geo.country].filter(Boolean).join(', ');
  const daysAhead = Math.round((parseDate(r.start) - parseDate(todayIso())) / 864e5);
  const loc = `latitude=${geo.latitude}&longitude=${geo.longitude}&temperature_unit=fahrenheit&timezone=auto`;
  let wx;
  if (daysAhead >= 0 && daysAhead + leg.days <= 15) {
    const d = (await getJSON(`https://api.open-meteo.com/v1/forecast?${loc}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${r.start}&end_date=${r.end}`)).daily;
    wx = { hi: Math.max(...d.temperature_2m_max), lo: Math.min(...d.temperature_2m_min), rain: Math.max(0, ...d.precipitation_probability_max.filter(x => x != null)), source: 'forecast' };
  } else {
    // Same dates in the most recent past year with complete data.
    let years = 1;
    while (addDays(r.end, -365 * years) > addDays(todayIso(), -5)) years++;
    const shift = iso => { const d = parseDate(iso); d.setFullYear(d.getFullYear() - years); return isoDate(d); };
    const d = (await getJSON(`https://archive-api.open-meteo.com/v1/archive?${loc}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${shift(r.start)}&end_date=${shift(r.end)}`)).daily;
    const wetDays = d.precipitation_sum.filter(x => x >= 1).length;
    wx = { hi: Math.max(...d.temperature_2m_max), lo: Math.min(...d.temperature_2m_min), rain: Math.round(wetDays / d.time.length * 100), source: 'typical' };
  }
  state.wx[wxKey(leg, i)] = { ...wx, hi: Math.round(wx.hi), lo: Math.round(wx.lo), place, cc: geo.country_code, country: geo.country };
  return geo;
}

async function fetchAllWeather() {
  let prev = null;
  for (let i = 0; i < state.legs.length; i++) {
    const leg = state.legs[i];
    if (state.wx[wxKey(leg, i)]) continue;
    try { prev = (await fetchWeather(leg, i, prev)) || prev; } catch { /* fall back to estimate */ }
  }
}

/* ---------- Recommendation engine (rule-based) ---------- */
function slotsFor(leg, i) {
  const a = actOf(leg), w = weatherFor(leg, i), b = band(w), wet = isWet(leg, i);
  return SLOT_ORDER.map(key => {
    let opts = a.slots[key] || [];
    if (b === 'cold' && COLD[key]) opts = [COLD[key](w.lo), ...opts];
    if (wet && a.rain[key]) opts = [a.rain[key], ...opts];
    if (b === 'hot' && key === 'Layer' && w.lo >= 62 && !wet) opts = [];
    return { key, opts: opts.filter(o => o.kind !== 'style' && !avoided(o.name)) };
  }).filter(s => s.opts.length);
}

// Weather overrides first, then the practical default.
const pick = slot => slot.opts.find(o => o.kind === 'rain') || slot.opts.find(o => o.kind === 'cold') || slot.opts[0];

const SLOT_GROUP = { Top: 'Tops', Bottom: 'Bottoms', Footwear: 'Shoes', Layer: 'Layers', Accessory: 'Accessories' };
const GROUP_ORDER = ['Tops', 'Bottoms', 'Layers', 'Shoes', 'Accessories', 'Underwear and socks', 'Sleepwear', 'Workout clothes'];
const groupOf = it => /sock/i.test(it.name) ? 'Underwear and socks' : ({ top: 'Tops', bottom: 'Bottoms', shoe: 'Shoes', layer: 'Layers' }[it.icon] || 'Accessories');

// Countries on the itinerary whose plugs differ from home.
function adapterNeeds() {
  const seen = new Map();
  state.legs.forEach((l, i) => {
    const w = state.wx[wxKey(l, i)];
    if (!w?.cc || w.cc === HOME_COUNTRY || seen.has(w.cc)) return;
    if (PLUGS[w.cc] && PLUGS[w.cc] === PLUGS[HOME_COUNTRY]) return;
    seen.set(w.cc, PLUGS[w.cc] ? `${w.country} uses type ${PLUGS[w.cc]} plugs` : `Check the plug type for ${w.country}`);
  });
  return [...seen.values()];
}

// Merges every stop's needs into one list, remembering which stops each item is for.
function checklist() {
  const map = new Map();
  const CL = 'Clothing & footwear';
  const add = (cat, item, li) => {
    const key = cat + ':' + item.name;
    const cur = map.get(key);
    if (cur) { cur.legs.add(li); cur.essential = cur.essential || item.essential; if (item.perDay) cur.qty += item.qty; return; }
    map.set(key, { ...item, cat, key, legs: new Set([li]) });
  };
  const all = state.legs.map((_, i) => i);
  const put = (cat, item) => map.set(cat + ':' + item.name, { ...item, cat, key: cat + ':' + item.name, legs: new Set(all) });

  state.legs.forEach((leg, li) => {
    const a = actOf(leg), w = weatherFor(leg, li), b = band(w), wet = isWet(leg, li);
    // Tops: one per day. Bottoms: each worn twice. Shoes, layers, accessories: one of each kind.
    slotsFor(leg, li).forEach(s => {
      const perDay = s.key === 'Top' || s.key === 'Bottom';
      const qty = s.key === 'Top' ? leg.days : s.key === 'Bottom' ? Math.ceil(leg.days / 2) : 1;
      add(CL, { ...pick(s), essential: true, group: SLOT_GROUP[s.key], qty, perDay }, li);
    });
    a.clothing.forEach(it => add(CL, { ...it, group: groupOf(it) }, li));
    if (b === 'cold') {
      COLD_EXTRAS(w.lo).forEach(it => add(CL, { ...it, essential: w.lo < 40, group: it.icon === 'top' ? 'Layers' : 'Accessories' }, li));
      const layer = slotsFor(leg, li).find(s => s.key === 'Layer');
      if (wet && layer && pick(layer).kind === 'rain') add(CL, { ...COLD.Layer(w.lo), essential: true, group: 'Layers', why: `Wear it under your rain shell. Lows near ${tF(w.lo)}.` }, li);
    }
    Object.entries(a.gear).forEach(([cat, items]) => {
      items.forEach(it => add(cat, it, li));
      if (cat === 'Activity gear' && wet) a.rainItems.forEach(it => add(cat, { ...it, rain: true }, li));
    });
  });

  const T = totalDays();
  const laundry = state.laundry === 'yes';
  // Laundry caps tops at 3 and bottoms at 2; pack-light halves them (re-wear).
  map.forEach(it => {
    if (!it.perDay) return;
    if (laundry) it.qty = Math.min(it.qty, it.group === 'Tops' ? 3 : 2);
    if (isLight()) it.qty = Math.ceil(it.qty / 2);
  });

  const EL = 'Electronics';
  put(EL, I('Charging cables', ['cable'], 'device', true, 'One for each device: phone, watch, earbuds.'));
  const adapters = adapterNeeds();
  if (adapters.length) put(EL, I('Travel adapter', ['adapter'], 'device', true, adapters.join('. ') + '.'));

  if (T >= 2) {
    put(CL, { ...I('Underwear and socks', ['underwear'], 'item', true, laundry ? 'Wash mid-trip and re-use.' : 'One pair for every day of the trip.'), qty: laundry ? Math.min(T, 4) : T, group: 'Underwear and socks' });
    put(CL, { ...COMMON.sleepwear, qty: 1, group: 'Sleepwear' });
    if (!laundry && T >= 4) put(CL, I('Laundry bag', ['laundry bag'], 'bag', false, 'Keeps worn clothes away from clean ones.'));
    put(EL, I('Wall charger', ['wall charger', 'charging brick'], 'device', true, 'Overnight charging at your lodging.'));

    const lod = state.lodging.length ? state.lodging : ['none'];
    const note = AMENITY_NOTE[['hostel', 'rental', 'camping', 'friends', 'hotel', 'none'].find(l => lod.includes(l))];
    const TL = 'Toiletries';
    put(TL, I('Toothbrush and toothpaste', ['toothbrush'], 'item', true, 'Most hotels and rentals don’t supply these.'));
    put(TL, I('Deodorant', ['deodorant'], 'item', true, 'Easy to forget, hard to borrow.'));
    put(TL, I('Travel shampoo and conditioner', ['shampoo'], 'bottle', false, note, 'Bar shampoo doesn’t count toward the liquids limit.'));
    put(TL, I('Travel body wash', ['body wash'], 'bottle', false, note));
    put(TL, I('Makeup and skincare', ['makeup'], 'item', false, 'Decant into travel-size containers to save space.'));
    put(TL, I('Medications', ['medication'], 'kit', true, 'Bring a few days extra of anything you take regularly.'));
    if (lod.includes('hostel')) {
      put(TL, I('Shower flip-flops', ['flip-flop'], 'shoe', false, 'For shared bathrooms.'));
      put(TL, I('Padlock', ['padlock'], 'item', false, 'For hostel lockers.'));
      put(TL, I('Quick-dry towel', ['quick-dry towel'], 'towel', false, 'Many hostels charge for towels.'));
    }
  } else {
    put('Personal essentials', I('Makeup for touch-ups', ['makeup'], 'item', false, 'Just the few things you’d reapply during the day.'));
  }

  const wk = state.workout;
  if (wk.days > 0) {
    const W = WORKOUTS[wk.kind];
    let n = wk.days;
    let why = `One fresh outfit for each of your ${plural(n, 'workout')}.`;
    if (wk.kind === 'swimming') { n = Math.min(n, 2); why = 'Bring two so one can dry between swims.'; }
    else if (laundry) { n = Math.min(n, 2); why = `Wash between sessions, so ${n} cover ${plural(wk.days, 'workout')}.`; }
    else if (isLight()) { n = Math.ceil(n / 2); why = 'Pack-light: wear each outfit twice and let it air-dry between sessions.'; }
    put('Workouts', { ...I(W.outfit, W.kw, 'top', true, why), qty: n, group: 'Workout clothes' });
    W.items.forEach(it => put('Workouts', it));
  }

  if (state.shopping === 'lots') put('Just in case', I('Foldable duffel or tote', ['duffel', 'foldable'], 'duffel', true, 'Pack it flat and use it for your shopping on the way home.'));
  if (state.packing === 'prepared') {
    [I('Spare layer', ['spare layer'], 'layer', false, 'Conditions change faster than forecasts.'),
     I('Small cash stash', ['cash'], 'item', false, 'For places that don’t take cards.')]
      .forEach(it => put('Just in case', it));
  }

  const items = [...map.values()].filter(i => !avoided(i.name) && !coveredByBag(i) && (!isLight() || i.essential));
  return LIST_ORDER.map(name => ({ name, items: items.filter(i => i.cat === name) })).filter(c => c.items.length);
}

const allItems = () => checklist().flatMap(c => c.items);
const isChecked = item => !!state.checked[item.key];
function legTag(item) {
  if (state.legs.length < 2 || item.legs.size === state.legs.length) return '';
  return `for ${[...item.legs].map(i => actName(state.legs[i]).toLowerCase()).join(' and ')}`;
}

/* ---------- Bag plan ---------- */
const unitSize = it => SIZE_BY_NAME[it.name] ?? SIZE_BY_ICON[it.icon] ?? .5;
const sizeOf = it => unitSize(it) * (it.qty || 1);

function bagPlan() {
  const bags = [];
  BAGS.forEach(b => {
    const n = state.bags[b.id] || 0;
    for (let k = 1; k <= n; k++) bags.push({ ...b, uid: `${b.id}-${k}`, name: n > 1 ? `${b.label} ${k}` : b.label, items: [], used: 0, reserve: 0 });
  });
  if (!bags.length) return null;
  const cap = bags.reduce((s, b) => s + b.cap, 0);

  // Shopping space: reserved in the bags you won't carry around all day, in proportion to size.
  const share = SHOPPING.find(s => s.id === state.shopping)?.share || 0;
  const hold = bags.some(b => b.tier !== 'personal') ? bags.filter(b => b.tier !== 'personal') : bags;
  const holdCap = hold.reduce((s, b) => s + b.cap, 0);
  hold.forEach(b => { b.reserve = Math.round(cap * share * b.cap / holdCap); });

  const items = allItems();
  // Travel-day outfit: a top and bottoms from the first stop, underwear and socks, plus the
  // bulkiest shoes and layer. One of each comes off the bag list (all of it if there's only one).
  const firstStop = i => i.legs.has(0) ? 1 : 0;
  const ofGroup = g => items.filter(i => i.group === g).sort((a, b) => firstStop(b) - firstStop(a))[0];
  const bulkiest = ic => items.filter(i => i.cat === 'Clothing & footwear' && i.icon === ic).sort((a, b) => unitSize(b) - unitSize(a))[0];
  const wornFrom = [...new Set([ofGroup('Tops'), ofGroup('Bottoms'), ofGroup('Underwear and socks'), bulkiest('shoe'), bulkiest('layer')].filter(Boolean))];
  const worn = [], split = new Map();
  wornFrom.forEach(it => {
    if ((it.qty || 1) > 1) {
      worn.push({ ...it, qty: 1, key: it.key + ':worn', worn: true });
      split.set(it, { ...it, qty: it.qty - 1 });
    } else {
      worn.push({ ...it, worn: true });
      split.set(it, null);
    }
  });
  const toPack = items.map(i => split.has(i) ? split.get(i) : i).filter(Boolean);

  const tiersFor = it => (PERSONAL_NAMES.includes(it.name) || it.name === 'Medications' || PERSONAL_CATS.includes(it.cat))
    ? ['personal', 'carry', 'checked'] : ['checked', 'carry', 'personal'];
  const first = it => tiersFor(it)[0] === 'personal' ? 0 : 1;
  const free = b => b.cap - b.reserve - b.used;
  toPack.sort((a, b) => first(a) - first(b) || sizeOf(b) - sizeOf(a)).forEach(it => {
    const s = sizeOf(it);
    let bag = null;
    for (const tier of tiersFor(it)) {
      bag = bags.filter(b => b.tier === tier && free(b) >= s).sort((a, b) => free(b) - free(a))[0];
      if (bag) break;
    }
    bag = bag || [...bags].sort((a, b) => free(b) - free(a))[0];
    bag.items.push(it);
    bag.used += s;
  });

  return {
    bags, worn, cap,
    all: [...worn, ...bags.flatMap(b => b.items)],
    used: bags.reduce((s, b) => s + b.used, 0),
    reserve: bags.reduce((s, b) => s + b.reserve, 0),
    over: bags.filter(b => b.used + b.reserve > b.cap),
    liquidsInCabin: bags.some(b => b.tier !== 'checked' && b.items.some(i => LIQUIDS.includes(i.name))),
  };
}

// Each tip: [short headline, one short line].
function tips(plan) {
  const out = [...new Set(state.legs.map(l => l.activity))].map(a => (ACTIVITIES[a] || ACTIVITIES.custom).tip);
  const ws = state.legs.map((l, i) => ({ l, w: weatherFor(l, i) }));
  if (ws.length > 1) {
    const hot = ws.reduce((a, b) => b.w.hi > a.w.hi ? b : a), cold = ws.reduce((a, b) => b.w.lo < a.w.lo ? b : a);
    if (hot !== cold && hot.w.hi - cold.w.lo >= 25) out.push(['Layer up', `${shortPlace(hot.l)} hits ${tF(hot.w.hi)}, ${shortPlace(cold.l)} drops to ${tF(cold.w.lo)}.`]);
  }
  const T = totalDays();
  if (T >= 3) out.push(state.laundry === 'yes' ? ['Wash once', 'Pack for about three days, then do a load.'] : ['Roll your clothes', `${T} days without laundry. Packing cubes help.`]);
  if (state.workout.days) out.push(['Bag your gym clothes', 'Keep sweaty clothes away from clean ones.']);
  if (plan?.reserve) out.push(['Shopping space saved', `About ${plan.reserve} L. Wrap souvenirs in soft clothes.`]);
  if (plan?.worn.length) out.push(['Wear it, don’t pack it', 'Travel in one outfit plus your bulkiest shoes and layer.']);
  if (plan?.over.length) out.push(['Too full', `${plan.over.map(b => b.name).join(' and ')}. Try pack-light mode or another bag.`]);
  if (plan?.liquidsInCabin) out.push(['Mind the liquids', 'Cabin bags: 3.4 oz (100 ml) max per container.']);
  if (isLight()) out.push(['Pack-light is on', 'Optional extras are hidden.']);
  if (state.rain) out.push(['Rain preview', 'Bag your electronics and pick quick-dry fabrics.']);
  return out;
}

/* ---------- Shared pieces ---------- */
function contours() {
  const centers = [[880, 230, 0], [180, 760, 2], [1150, 760, 4]];
  let s = '';
  centers.forEach(([cx, cy, ph]) => {
    for (let r = 1; r <= 11; r++) {
      const R = r * 34;
      let d = '';
      for (let a = 0; a <= 72; a++) {
        const t = (a / 72) * Math.PI * 2;
        const n = 1 + 0.13 * Math.sin(3 * t + r * 0.55 + ph) + 0.07 * Math.sin(5 * t - r * 0.3);
        d += (a ? 'L' : 'M') + (cx + Math.cos(t) * R * n * 1.35).toFixed(1) + ' ' + (cy + Math.sin(t) * R * n).toFixed(1);
      }
      s += `<path d="${d}Z"/>`;
    }
  });
  return s;
}

const logo = (light) => `
  <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="5" y="9" width="22" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 9V6.5A1.5 1.5 0 0 1 13.5 5h5A1.5 1.5 0 0 1 20 6.5V9" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M9 22l5-6 3 3.5 2-2 4 4.5" fill="none" stroke="${light ? '#F3E0D5' : '#A9502F'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>PackWise`;

function stepsBar(cur) {
  const ci = SCREENS.indexOf(cur);
  return `<ol class="steps" aria-label="Progress">${SCREENS.map((s, i) => {
    const cls = i < ci ? 'done' : i === ci ? 'current' : '';
    return `<li class="${cls}"><button data-act="go:${s}" ${i > state.reached ? 'disabled' : ''} ${i === ci ? 'aria-current="step"' : ''} id="step-${s}">
      <span class="dot">${i < ci ? icon('check') : ''}</span>${STEP_LABELS[i]}</button></li>`;
  }).join('')}</ol>`;
}

function shell(cur, body, actions) {
  return `
  <div class="shell">
    <header class="app-top">
      <button class="logo" data-act="home" aria-label="PackWise home">${logo(false)}</button>
      <button class="link" data-act="restart" id="restart">Start over</button>
    </header>
    ${stepsBar(cur)}
    <main id="main" tabindex="-1">${body}</main>
  </div>
  <div class="actions"><div class="actions-inner">${actions}</div></div>`;
}

const codeOf = dest => {
  const words = dest.split(',')[0].trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('') : (words[0] || '???').slice(0, 3)).toUpperCase();
};

const STUB_LABEL = { forecast: 'Forecast', typical: 'Typical', estimate: 'Estimate' };

function ticket() {
  const legs = state.legs;
  const ws = legs.map((l, i) => weatherFor(l, i));
  const hi = Math.max(...ws.map(w => w.hi)), lo = Math.min(...ws.map(w => w.lo));
  const sources = [...new Set(ws.map(w => w.source))];
  const first = legRange(0), last = legRange(legs.length - 1);
  const T = totalDays();

  // Unique places in order, merging back-to-back repeats (e.g. two activities in Busan).
  const places = legs.reduce((acc, l) => {
    const p = shortPlace(l);
    if (!acc.length || acc[acc.length - 1].name.toLowerCase() !== p.toLowerCase()) acc.push({ name: p, leg: l });
    return acc;
  }, []);
  const a = places[0], z = places[places.length - 1];
  const middle = places.length > 2 ? `<span class="t-more">+${places.length - 2} stop${places.length > 3 ? 's' : ''}</span>` : icon(actOf(z.leg).icon);
  const route = places.length === 1
    ? `<span class="t-code">${esc(codeOf(a.leg.destination))}</span><span class="line">${icon(actOf(a.leg).icon)}</span>`
    : `<span class="t-code">${esc(codeOf(a.leg.destination))}</span><span class="line">${middle}</span><span class="t-code">${esc(codeOf(z.leg.destination))}</span>`;
  const names = places.length <= 3 ? places.map(p => p.name).join(' → ') : `${a.name} → ${places.length - 2} more → ${z.name}`;

  const sameMonth = first.start.slice(0, 7) === last.end.slice(0, 7);
  const dates = first.start === last.end ? fmt(first.start, { month: 'short', day: 'numeric' })
    : sameMonth ? `${fmt(first.start, { month: 'short', day: 'numeric' })}–${parseDate(last.end).getDate()}`
    : `${fmt(first.start, { month: 'short', day: 'numeric' })} – ${fmt(last.end, { month: 'short', day: 'numeric' })}`;

  return `
  <section class="ticket" aria-label="Trip summary">
    <div class="t-main">
      <div class="t-sub">${places.length > 1 ? `${places.length} places · ${plural(legs.length, 'stop')}` : 'Destination'}</div>
      <div class="t-route ${places.length === 1 ? 'solo' : ''}" aria-hidden="true">${route}</div>
      <div class="t-name" title="${esc(places.map(p => p.name).join(' → '))}">${esc(names)}</div>
      <dl class="t-grid">
        <div><dt>Dates</dt><dd>${esc(dates)}</dd></div>
        <div><dt>Length</dt><dd>${plural(T, 'day')}</dd></div>
        <div><dt>Bags</dt><dd>${Object.values(state.bags).reduce((x, y) => x + y, 0)}</dd></div>
      </dl>
    </div>
    <div class="t-stub">
      <span class="t-sim">${sources.length === 1 ? STUB_LABEL[sources[0]] : 'Mixed'}</span>
      <div><div class="t-temp">${hi}°F</div><small>${toC(hi)}°C high</small></div>
      <small>Low ${lo}°F<br>${toC(lo)}°C</small>
    </div>
  </section>`;
}

function stopsList() {
  return `<ol class="stops">${state.legs.map((l, i) => {
    const w = weatherFor(l, i), b = band(w);
    return `<li>
      <span class="n">${i + 1}</span>
      <div class="stop-body">
        <div class="stop-top"><strong>${esc(legTitle(l))}</strong><span class="hint">${esc(rangeLabel(legRange(i)))} · ${plural(l.days, 'day')}</span></div>
        <div class="wx">
          <span class="wx-temp">${w.hi}° / ${w.lo}°F</span>
          <span class="wx-c">${toC(w.hi)}° / ${toC(w.lo)}°C</span>
        </div>
        <div class="wx">
          <span class="badge b-band b-${b}">${BAND_LABEL[b]}</span>
          <span class="badge b-rain ${isWet(l, i) ? 'likely' : ''}">${icon('rain')}${state.rain && w.rain < 50 ? 'Rain preview' : `Rain ${w.rain}%`}</span>
        </div>
        <p class="wx-src">${w.source === 'estimate' ? (w.near ? `Estimate, borrowed from ${esc(w.near)}` : 'Estimate, weather couldn’t load') : `${SOURCE_LABEL[w.source]} · ${esc(w.place)}`}</p>
      </div>
    </li>`;
  }).join('')}</ol>
  <p class="wx-note">Wrong place? Add a state or country to the destination.</p>`;
}

const stepper = (label, value, dec, inc, decDisabled, incDisabled, idp, cls = '') => `
  <div class="stepper ${cls}" role="group" aria-label="${label}">
    <button data-act="${dec}" aria-label="Decrease ${label.toLowerCase()}" ${decDisabled ? 'disabled' : ''} id="${idp}-m">${icon('minus')}</button>
    <output aria-live="polite">${value}</output>
    <button data-act="${inc}" aria-label="Increase ${label.toLowerCase()}" ${incDisabled ? 'disabled' : ''} id="${idp}-p">${icon('plus')}</button>
  </div>`;

/* ---------- Screens ---------- */
function homeScreen() {
  return `
  <header class="hero">
    <svg class="hero-map" viewBox="0 0 1200 800" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <g class="contours">${contours()}</g>
      <circle class="start" cx="120" cy="780" r="6"/>
      <path class="route" d="M120 780 C 300 690, 330 600, 520 590 S 760 520, 800 420 S 860 270, 960 212"/>
      <g transform="translate(960 212)"><g class="pin">
        <path d="M0 0c-9-12-15-19-15-27a15 15 0 0 1 30 0c0 8-6 15-15 27Z" fill="#F3E0D5"/>
        <circle cy="-27" r="5.5" fill="#1E3A2B"/>
      </g></g>
    </svg>
    <div class="topbar">
      <span class="logo">${logo(true)}</span>
      <button class="btn btn-ghost-light" style="min-height:42px;padding:0 18px" data-act="sample">Sample plan</button>
    </div>
    <div class="hero-body">
      <h1>Your adventure, perfectly packed.</h1>
      <p class="lede">Tell PackWise where you’re going and for how long. You’ll get a packing list with how many of each thing to bring, sorted into the bags you’re taking.</p>
      <div class="hero-ctas">
        <button class="btn btn-light" data-act="start" id="cta-start">Plan my adventure</button>
        <button class="btn btn-ghost-light" data-act="sample">Explore a sample plan</button>
      </div>
    </div>
  </header>

  <main id="main" tabindex="-1">
    <section class="home-section">
      <h2>Bring the right things, in the right amounts.</h2>
      <div class="values">
        <div class="value"><h3>Every stop, its own weather</h3><p>A concert in a warm city, then three cold days in the mountains? Each stop gets its own forecast, merged into one list.</p></div>
        <div class="value"><h3>Counts, not guesswork</h3><p>How many tops, bottoms, and socks you need, adjusted for trip length, workouts, and whether you can do laundry.</p></div>
        <div class="value"><h3>Fits the bags you’re bringing</h3><p>Backpack, carry-on, or two checked bags. PackWise shows what goes in each one and saves room for shopping.</p></div>
      </div>
    </section>

    <section class="home-section" style="padding-top:0">
      <h2>From plan to packed in three steps</h2>
      <ol class="journey">
        <li><span class="n">1</span><div><strong>Map out your trip</strong><span>Add each activity, where it is, and how many days, or upload your itinerary as a Word or Excel file.</span></div></li>
        <li><span class="n">2</span><div><strong>Get your plan</strong><span>Weather for each stop, clothing counts, a checklist, and what goes in which bag.</span></div></li>
        <li><span class="n">3</span><div><strong>Pack</strong><span>Check items off bag by bag until everything’s in.</span></div></li>
      </ol>
      <button class="btn" data-act="start" style="margin:8px 0 40px">Plan my adventure</button>
      <div class="note">${icon('spark')}<p><strong>Prototype note.</strong> Weather comes from Open-Meteo: a live forecast for the next two weeks, and the same dates last year for trips further out. If it can’t load, the plan shows a labeled estimate. Packing recommendations and itinerary import use rule-based logic. This demo doesn’t call a live AI model.</p></div>
    </section>
  </main>
  <footer class="footer">PackWise · class prototype</footer>`;
}

function importBox() {
  const pv = state.importPreview;
  let review = '';
  if (pv?.error) {
    review = `<p class="err" id="import-review">${esc(pv.error)}</p>`;
  } else if (pv && !pv.stops.length) {
    review = `<div class="import-review" id="import-review"><p><strong>No activities found in ${esc(pv.file)}.</strong> Try a table with Date, Activity, Location, and Days columns, or lines like “Nov 7: Concert in San Jose, CA”.</p>
      <div class="import-acts"><button class="link" data-act="import-cancel">Dismiss</button></div></div>`;
  } else if (pv) {
    review = `
    <div class="import-review" id="import-review" aria-live="polite">
      <h3>Found ${plural(pv.stops.length, 'stop')} in ${pv.sample ? 'the sample itinerary' : esc(pv.file)}</h3>
      <p class="hint">Matched with simple rules, not AI. Check each stop below. You can still edit everything afterwards.</p>
      <ol class="import-stops">${pv.stops.map(st => {
        const a = ACTIVITIES[st.activity] || ACTIVITIES.custom;
        const name = st.activity === 'custom' ? st.custom : a.label;
        return `<li>${icon(a.icon)}<div>
          <strong>${esc(name)} · ${st.destination ? esc(st.destination) : '<span class="miss-txt">place not found</span>'}</strong>
          <span class="hint">${st.date ? esc(fmt(st.date)) + ' · ' : ''}${plural(st.days, 'day')}</span>
          <small>From: “${esc(st.source.split('\n')[0])}”</small></div></li>`;
      }).join('')}</ol>
      ${pv.start ? `<p class="import-meta">${icon('check')}Trip starts ${esc(fmt(pv.start))}</p>` : ''}
      ${pv.workout ? `<p class="import-meta">${icon('dumbbell')}Workouts: ${esc(WORKOUTS[pv.workout.kind].label)}, ${pv.workout.days === 'all' ? 'every day' : plural(pv.workout.days, 'day')}</p>` : ''}
      ${pv.skipped.length ? `<details class="skipped"><summary>Skipped ${plural(pv.skipped.length, 'line')}</summary><ul>${pv.skipped.map(k => `<li>${esc(k.line)} <span class="hint">· ${esc(k.why)}</span></li>`).join('')}</ul></details>` : ''}
      <div class="import-acts">
        <button class="btn" data-act="import-apply:replace" id="import-replace">Use these stops</button>
        ${state.legs.some(l => l.activity || l.destination.trim()) ? `<button class="btn btn-ghost" data-act="import-apply:add" id="import-add">Add after my stops</button>` : ''}
        <button class="link" data-act="import-cancel">Discard</button>
      </div>
    </div>`;
  }
  return `
  <div class="import">
    <div class="import-head">${icon('map', 'i big')}<div><strong>Already have an itinerary?</strong><span class="hint">Upload a Word or Excel file and PackWise fills in your stops.</span></div></div>
    <div class="btns">
      <label class="btn btn-ghost" for="f-itin" tabindex="0" id="itin-label">${icon('upload')}Upload itinerary</label>
      <button class="btn btn-ghost" data-act="import-sample" id="import-sample">Try a sample</button>
    </div>
    <input type="file" id="f-itin" accept=".docx,.xlsx,.csv,.txt" class="sr">
    <p class="hint">Works with .docx, .xlsx, .csv, and .txt. A table with Date, Activity, Location, and Days columns works best.</p>
    ${review}
  </div>`;
}

function setupScreen() {
  const e = state.errors;
  const err = k => e[k] ? `<p class="err" id="err-${k}">${esc(e[k])}</p>` : '';
  const T = totalDays();
  const wk = state.workout;

  const legCard = (l, i) => `
    <li class="leg">
      <div class="leg-head">
        <span class="n">${i + 1}</span>
        <div class="leg-when"><strong>Stop ${i + 1}</strong><span class="hint">${esc(rangeLabel(legRange(i)))}</span></div>
        <div class="leg-tools">
          ${i > 0 ? `<button class="icon-btn" data-act="leg-up:${l.id}" aria-label="Move stop ${i + 1} earlier" id="up-${l.id}">${icon('up')}</button>` : ''}
          ${i < state.legs.length - 1 ? `<button class="icon-btn" data-act="leg-down:${l.id}" aria-label="Move stop ${i + 1} later" id="down-${l.id}">${icon('down')}</button>` : ''}
          ${state.legs.length > 1 ? `<button class="icon-btn" data-act="leg-del:${l.id}" aria-label="Remove stop ${i + 1}">${icon('close')}</button>` : ''}
        </div>
      </div>
      <div class="leg-label" id="lab-act-${l.id}">Activity</div>
      ${l.activity && !l.picking ? `
      <div class="act-chosen">${icon(actOf(l).icon)}<strong>${esc(ACTIVITIES[l.activity].label)}</strong>
        <button class="link" data-act="leg-change:${l.id}" id="chg-${l.id}">Change</button></div>` : `
      <div class="act-picker" role="group" aria-labelledby="lab-act-${l.id}">${ACTIVITY_GROUPS.map(([g, ids]) => `
        <div class="act-group"><span class="act-group-label">${g}</span>
          <div class="act-grid">${ids.map(id => `<button class="act-tile" data-act="leg-act:${l.id}:${id}" aria-pressed="${l.activity === id}" id="la-${l.id}-${id}">${icon(ACTIVITIES[id].icon)}<span>${ACTIVITIES[id].label}</span></button>`).join('')}</div>
        </div>`).join('')}
      </div>`}
      ${err('act-' + l.id)}
      ${l.activity === 'custom' ? `<label class="sr" for="leg-custom-${l.id}">Name your activity</label>
        <input class="field ${e['custom-' + l.id] ? 'invalid' : ''}" style="margin-top:10px" id="leg-custom-${l.id}" data-leg="${l.id}" data-field="custom" placeholder="Name your activity, e.g. Wedding, Ski day" value="${esc(l.custom)}">${err('custom-' + l.id)}` : ''}
      <div class="leg-row">
        <div>
          <label class="leg-label" for="leg-dest-${l.id}">Where</label>
          <input class="field ${e['dest-' + l.id] ? 'invalid' : ''}" id="leg-dest-${l.id}" data-leg="${l.id}" data-field="destination" placeholder="e.g. San Jose, CA" value="${esc(l.destination)}" autocomplete="off">
          ${err('dest-' + l.id)}
        </div>
        <div>
          <span class="leg-label">Days</span>
          ${stepper('Days', l.days, `leg-days:${l.id}:-1`, `leg-days:${l.id}:1`, l.days <= 1, l.days >= 30, `days-${l.id}`)}
        </div>
      </div>
    </li>`;

  const bagCount = Object.values(state.bags).reduce((a, b) => a + b, 0);
  const bagCap = BAGS.reduce((s, b) => s + (state.bags[b.id] || 0) * b.cap, 0);

  const body = `
    <div class="screen-head"><h1>Where are you headed?</h1><p>Add each activity in the order you’ll do it. Every stop gets its own weather.</p></div>

    <div class="setup-grid"><div class="col-main">
    <div class="group">${importBox()}</div>

    <div class="group">
      <label for="f-start">Trip starts</label>
      <input class="field ${e.start ? 'invalid' : ''}" id="f-start" type="date" min="${todayIso()}" data-bind="start" value="${esc(state.start)}" style="max-width:240px">
      ${err('start')}
    </div>

    <fieldset>
      <legend>Your itinerary <span class="hint">· ${plural(T, 'day')} total</span></legend>
      <ol class="legs">${state.legs.map(legCard).join('')}</ol>
      <button class="btn btn-ghost btn-block" data-act="leg-add" id="leg-add">${icon('plus')}Add another activity</button>
    </fieldset>
    </div>
    <div class="col-side">

    <fieldset>
      <legend>Working out during the trip?</legend>
      <p class="hint" style="margin:-4px 0 12px">For routines alongside your stops, like the hotel gym each morning.</p>
      <div class="panel">
        <div class="chips">${Object.entries(WORKOUTS).map(([id, w]) => `<button class="chip" data-act="wk-kind:${id}" aria-pressed="${wk.kind === id}" id="wk-${id}">${w.label}</button>`).join('')}</div>
        <div class="panel-row">
          <div><strong>Workout days</strong><span class="hint">${wk.days === 0 ? 'None planned' : wk.days >= T ? 'Every day' : `${wk.days} of ${T} days`}</span></div>
          ${stepper('Workout days', wk.days, 'wk-days:-1', 'wk-days:1', wk.days <= 0, wk.days >= T, 'wkd')}
        </div>
      </div>
    </fieldset>

    ${T >= 2 ? `<fieldset>
      <legend>Where are you staying? <span class="hint">· pick all that apply</span></legend>
      <div class="chips">${LODGING.map(l => `<button class="chip" data-act="lodge:${l.id}" aria-pressed="${state.lodging.includes(l.id)}" id="lodge-${l.id}">${l.label}</button>`).join('')}</div>
      <p class="hint" style="margin-top:8px">Decides which toiletries to suggest. Not every place provides shampoo or body wash.</p>
      <div class="label" style="margin-top:20px;font-weight:600">Can you do laundry?</div>
      <div class="seg two" role="group" aria-label="Laundry">
        <button data-act="laundry:yes" aria-pressed="${state.laundry === 'yes'}" id="laundry-yes"><strong>Yes</strong><span>Pack fewer clothes</span></button>
        <button data-act="laundry:no" aria-pressed="${state.laundry === 'no'}" id="laundry-no"><strong>No</strong><span>A fresh set each day</span></button>
      </div>
    </fieldset>` : ''}

    <fieldset ${e.bags ? 'aria-describedby="err-bags"' : ''}>
      <legend>What bags are you bringing? <span class="hint">· about ${bagCap} L total</span></legend>
      <ul class="bag-list">${BAGS.map(b => {
        const n = state.bags[b.id] || 0;
        return `<li class="${n ? 'on' : ''}">
          <span class="ic">${icon(b.icon)}</span>
          <div><strong>${b.label}</strong><span class="hint">About ${b.cap} L</span></div>
          ${stepper(b.label, n, `bag:${b.id}:-1`, `bag:${b.id}:1`, !n, n >= 4, `bag-${b.id}`, 'sm')}
        </li>`;
      }).join('')}</ul>
      ${bagCount ? '' : err('bags')}
    </fieldset>

    <fieldset>
      <legend>Planning to go shopping?</legend>
      <div class="seg" role="group" aria-label="Shopping">${SHOPPING.map(s => `<button data-act="shopping:${s.id}" aria-pressed="${state.shopping === s.id}" id="shop-${s.id}"><strong>${s.label}</strong><span>${s.desc}</span></button>`).join('')}</div>
      ${state.shopping !== 'none' && bagCap ? `<p class="hint" style="margin-top:8px">PackWise will keep about ${Math.round(bagCap * SHOPPING.find(s => s.id === state.shopping).share)} L free in your bags${state.shopping === 'lots' ? ' and add a foldable duffel to the list' : ''}.</p>` : ''}
    </fieldset>

    <fieldset>
      <legend>How do you like to pack?</legend>
      <div class="seg">${PACKING.map(p => `<button data-act="packing:${p.id}" aria-pressed="${state.packing === p.id}" id="pack-${p.id}"><strong>${p.label}</strong><span>${p.desc}</span></button>`).join('')}</div>
    </fieldset>

    <div class="group">
      <label for="f-avoid">Anything to leave out? <span class="hint">(optional)</span></label>
      <input class="field" id="f-avoid" data-bind="avoid" placeholder="e.g. sandals, umbrella" value="${esc(state.avoid)}">
      <p class="hint" style="margin-top:6px">Separate with commas. PackWise won’t recommend these.</p>
    </div>
    </div></div>`;
  return shell('setup', body,
    `<button class="btn btn-ghost" data-act="home">Back</button><button class="btn" data-act="setup-next" id="setup-next">Build my plan</button>`);
}

function garments(items) {
  const clothes = items.filter(i => i.group);
  return GROUP_ORDER.map(g => ({ g, lines: clothes.filter(i => i.group === g) })).filter(x => x.lines.length).map(({ g, lines }) => `
    <li>
      <span class="g-count">${lines.reduce((n, i) => n + (i.qty || 1), 0)}</span>
      <div class="g-body"><strong>${g}</strong>
        <ul class="g-lines">${lines.map(i => {
          const why = [legTag(i), i.kind === 'rain' ? 'for rain' : i.kind === 'cold' ? 'for the cold' : ''].filter(Boolean).join(', ');
          return `<li>${i.qty || 1} × ${esc(i.name)}${why ? ` <span class="hint">· ${esc(why)}</span>` : ''}</li>`;
        }).join('')}</ul>
      </div>
    </li>`).join('');
}

const itemRow = i => `<li>${icon(i.icon)}<span>${esc(i.name)}</span>${i.qty > 1 ? `<span class="q">×${i.qty}</span>` : ''}</li>`;

function bagCard(b) {
  const room = b.cap - b.reserve;
  const over = b.used > room;
  const usedPct = Math.min(100, b.used / b.cap * 100);
  return `
  <article class="bag-card ${over ? 'over' : ''}">
    <div class="bag-head">
      <span class="bag-ic">${icon(b.icon)}</span>
      <div><strong>${esc(b.name)}</strong><span class="hint">${TIER_LABEL[b.tier]} · ${plural(b.items.length, 'item')}</span></div>
      <span class="bag-l">${Math.round(b.used)} / ${b.cap} L</span>
    </div>
    <div class="meter" aria-hidden="true">
      <span class="m-used" style="width:${usedPct}%"></span>
      ${b.reserve ? `<span class="m-shop" style="width:${Math.min(100 - usedPct, b.reserve / b.cap * 100)}%"></span>` : ''}
    </div>
    ${over ? `<p class="err" style="margin-top:8px">About ${Math.round(b.used - room)} L too full${b.reserve ? ' with shopping space saved' : ''}</p>` : ''}
    ${b.items.length ? `<ul class="bag-items">${(state.openBags[b.uid] ? b.items : b.items.slice(0, 6)).map(itemRow).join('')}</ul>
      ${b.items.length > 6 ? `<button class="link more" data-act="bag-open:${b.uid}" id="more-${b.uid}" aria-expanded="${!!state.openBags[b.uid]}">${state.openBags[b.uid] ? 'Show fewer' : `Show all ${b.items.length} items`}</button>` : ''}`
      : '<p class="hint" style="margin-top:10px">Empty for now.</p>'}
    ${b.reserve ? `<div class="shop-space">${icon('tote')}About ${b.reserve} L left free for shopping</div>` : ''}
  </article>`;
}

function planScreen() {
  const items = allItems();
  const plan = bagPlan();
  const T = totalDays();
  const tipList = tips(plan);
  const clothesCount = items.filter(i => i.group).reduce((n, i) => n + (i.qty || 1), 0);
  const TABS = [['bags', 'Bags', plan.bags.length], ['clothes', 'Clothes', clothesCount], ['list', 'Full list', items.length], ['tips', 'Tips', tipList.length]];
  const tab = TABS.some(t => t[0] === state.planTab) ? state.planTab : 'bags';

  let panel;
  if (tab === 'bags') {
    panel = `
      <p class="panel-lede">About ${Math.round(plan.used)} of ${plan.cap} L used${plan.reserve ? `, ${plan.reserve} L saved for shopping` : ''}. Volumes are rough estimates.</p>
      <div class="bag-grid">
        ${plan.worn.length ? `<article class="bag-card worn-card">
          <div class="bag-head"><span class="bag-ic">${icon('layer')}</span><div><strong>Wear on travel day</strong><span class="hint">One outfit plus your bulkiest pieces. Not counted in your bags.</span></div></div>
          <ul class="bag-items">${plan.worn.map(itemRow).join('')}</ul>
        </article>` : ''}
        ${plan.bags.map(bagCard).join('')}
      </div>`;
  } else if (tab === 'clothes') {
    panel = `
      <p class="panel-lede">${plural(T, 'day')}, ${state.laundry === 'yes' && T >= 2 ? 'with laundry' : 'no laundry'}${isLight() ? ', pack-light' : ''}. One top per day, bottoms worn twice, one of each shoe and layer. Totals include what you wear on travel day.</p>
      <ul class="garments">${garments(items)}</ul>`;
  } else if (tab === 'list') {
    panel = `
      <div class="panel-bar"><p class="panel-lede">Everything for the trip, by category.</p>
        <label class="mini-switch" for="t-why"><input type="checkbox" class="switch" id="t-why" data-toggle="why" ${state.showWhy ? 'checked' : ''}>Show reasons</label></div>
      <div class="cats-cols">${checklist().map(c => `
        <div class="cat">
          <h3>${c.name}<span class="count">${c.items.length}</span></h3>
          <ul class="items">${c.items.map(i => {
            const meta = [i.essential ? '' : 'Optional', legTag(i), i.rain ? 'added for rain' : ''].filter(Boolean).join(' · ');
            return `<li class="item">${icon(i.icon)}
              <div><div class="nm">${esc(i.name)}${i.qty > 1 ? ` <small>× ${i.qty}</small>` : ''}</div>
                ${state.showWhy ? `<p class="why">${esc(i.why)}</p>` : ''}${meta ? `<span class="opt">${esc(meta)}</span>` : ''}</div>
            </li>`;
          }).join('')}</ul>
        </div>`).join('')}</div>`;
  } else {
    panel = `<ul class="tips">${tipList.map(([lead, line]) => `<li>${icon('spark')}<div><strong>${esc(lead)}</strong><span>${esc(line)}</span></div></li>`).join('')}</ul>`;
  }

  const body = `
    <div class="screen-head"><h1>Your PackWise plan</h1><p>${plural(items.length, 'item')} for ${plural(T, 'day')}, sorted into ${plural(plan.bags.length, 'bag')}.</p></div>
    <div class="split">
      <aside class="split-side" aria-label="Trip summary">
        ${ticket()}
        <section class="side-block" aria-labelledby="stops-h">
          <h2 class="side-h" id="stops-h">Weather</h2>
          ${stopsList()}
        </section>
        <div class="toggles">
          <label class="switch-row" for="t-rain"><span class="txt"><strong>What if it rains?</strong><span>Preview rain on every stop.</span></span>
            <input type="checkbox" class="switch" id="t-rain" data-toggle="rain" ${state.rain ? 'checked' : ''}></label>
          <label class="switch-row" for="t-light"><span class="txt"><strong>Pack-light mode</strong><span>Hide extras and re-wear more.</span></span>
            <input type="checkbox" class="switch" id="t-light" data-toggle="light" ${isLight() ? 'checked' : ''}></label>
        </div>
      </aside>
      <div class="split-main">
        <div class="ptabs" role="tablist" aria-label="Plan views">${TABS.map(([id, label, n]) =>
          `<button class="ptab" role="tab" aria-selected="${tab === id}" aria-controls="plan-panel" data-act="ptab:${id}" id="ptab-${id}">${label}<span>${n}</span></button>`).join('')}</div>
        <div class="ppanel" role="tabpanel" id="plan-panel" aria-labelledby="ptab-${tab}">${panel}</div>
      </div>
    </div>`;
  return shell('plan', body,
    `<button class="btn btn-ghost" data-act="go:setup">Edit trip</button><button class="btn" data-act="go:pack" id="to-pack">Start packing</button>`);
}

function packGroups(plan, cats) {
  const g = [];
  if (plan.worn.length) g.push({ id: 'worn', title: 'Wear on travel day', icon: 'layer', items: plan.worn, sub: 'Put these on before you leave' });
  if (state.groupBy === 'bag') {
    plan.bags.forEach(b => b.items.length && g.push({ id: b.uid, title: b.name, icon: b.icon, items: b.items, sub: `${TIER_LABEL[b.tier]} · ${Math.round(b.used)} / ${b.cap} L` }));
    return g;
  }
  const packed = plan.bags.flatMap(b => b.items);
  LIST_ORDER.forEach(name => {
    const list = packed.filter(i => i.cat === name);
    if (list.length) g.push({ id: name, title: name, icon: list[0].icon, items: list });
  });
  return g;
}

function packScreen() {
  const cats = checklist();
  const plan = bagPlan();
  const items = plan.all;
  const done = items.filter(isChecked).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const groups = packGroups(plan, cats);
  const gi = Math.max(0, groups.findIndex(g => g.id === state.packGroup));
  const cur = groups[gi], next = groups[gi + 1];

  const row = i => {
    const on = isChecked(i);
    const id = 'chk-' + safeId(i.key);
    const meta = i.worn ? 'Wear it' : [i.essential ? '' : 'Optional', legTag(i)].filter(Boolean).join(' · ');
    return `<li><label class="check ${on ? 'done' : ''}" for="${id}">
      <input type="checkbox" id="${id}" data-check="${esc(i.key)}" ${on ? 'checked' : ''}>
      <div><div class="nm">${esc(i.name)}${i.qty > 1 ? ` <small>× ${i.qty}</small>` : ''}</div>${meta ? `<span class="opt">${esc(meta)}</span>` : ''}</div>
      ${icon(i.icon)}
    </label></li>`;
  };

  const nav = groups.map((g, k) => {
    const d = g.items.filter(isChecked).length;
    return `<li><button class="gnav ${k === gi ? 'on' : ''}" data-act="pgroup:${esc(g.id)}" id="gnav-${safeId(g.id)}" ${k === gi ? 'aria-current="true"' : ''}>
      <span class="gnav-ic">${icon(g.icon)}</span>
      <span class="gnav-t"><strong>${esc(g.title)}</strong><span class="meter"><span class="m-used" style="width:${g.items.length ? d / g.items.length * 100 : 0}%"></span></span></span>
      <span class="gnav-n">${d === g.items.length ? icon('check') : `${d}/${g.items.length}`}</span>
    </button></li>`;
  }).join('');

  const finishedCard = state.finished ? `
    <section class="done-card" aria-live="polite">
      <svg class="i stamp" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="${ICONS.check}"/></svg>
      <h1>You’re packed.</h1>
      <p>Everything for ${esc(state.legs.map(l => shortPlace(l)).join(' and '))} is ready. Enjoy the trip.</p>
      <button class="btn btn-light" data-act="restart">Plan another adventure</button>
    </section>` : '';

  const body = `
    <div class="screen-head"><h1>Let’s pack</h1><p>Work through one ${state.groupBy === 'bag' ? 'bag' : 'category'} at a time.</p></div>
    <div class="split">
      <aside class="split-side" aria-label="Packing progress">
        <div class="progress-wrap" aria-live="polite">
          <div class="progress-top"><strong>${done} of ${items.length} packed</strong><span>${pct}%</span></div>
          <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Packing progress">
            <span class="fill" style="width:${pct}%"></span><span class="flag ${pct === 100 ? 'reached' : ''}"></span>
          </div>
        </div>
        <div class="seg two" role="group" aria-label="Group checklist">
          <button data-act="group:bag" aria-pressed="${state.groupBy === 'bag'}" id="g-bag"><strong>By bag</strong></button>
          <button data-act="group:category" aria-pressed="${state.groupBy === 'category'}" id="g-cat"><strong>By category</strong></button>
        </div>
        <ul class="gnav-list">${nav}</ul>
      </aside>
      <div class="split-main">
        ${finishedCard}
        <section class="pack-group" aria-labelledby="pg-h">
          <div class="bag-head">
            <span class="bag-ic">${icon(cur.icon)}</span>
            <div><h2 id="pg-h">${esc(cur.title)}</h2>${cur.sub ? `<span class="hint">${esc(cur.sub)}</span>` : ''}</div>
            <span class="bag-l">${cur.items.filter(isChecked).length} / ${cur.items.length}</span>
          </div>
          <ul class="items">${cur.items.map(row).join('')}</ul>
          ${next ? `<button class="btn btn-ghost next-group" data-act="pgroup:${esc(next.id)}" id="next-group">Next: ${esc(next.title)}</button>` : ''}
        </section>
      </div>
    </div>`;
  return shell('pack', body,
    `<button class="btn btn-ghost" data-act="go:plan">Back</button><button class="btn" data-act="finish" id="finish">${state.finished ? 'Packed' : 'Finish packing'}</button>`);
}

/* ---------- Render ---------- */
function render(opts = {}) {
  const focusId = document.activeElement?.id;
  const screens = { home: homeScreen, setup: setupScreen, plan: planScreen, pack: packScreen };
  root.innerHTML = (screens[state.screen] || homeScreen)();
  save();
  if (opts.newScreen) {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  } else if (focusId) {
    document.getElementById(focusId)?.focus({ preventScroll: true });
  }
}

function go(screen) {
  const i = SCREENS.indexOf(screen);
  if (i > state.reached) state.reached = i;
  state.screen = screen;
  render({ newScreen: true });
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

async function generate() {
  if (!validateSetup()) {
    state.screen = 'setup';
    render({ newScreen: true });
    document.querySelector('.err')?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    toast('Finish your trip details first');
    return;
  }
  const lines = ['Mapping your stops…', ...state.legs.map(l => `Checking weather in ${shortPlace(l)}…`), 'Fitting everything into your bags…'];
  const el = document.createElement('div');
  el.className = 'overlay';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div>
    <svg class="trail" viewBox="0 0 220 90" aria-hidden="true"><circle cx="12" cy="76" r="5"/><path d="M12 76 C 60 76, 60 30, 110 34 S 170 14, 208 14"/></svg>
    <h2>Building your plan</h2><p>${esc(lines[0])}</p></div>`;
  document.body.appendChild(el);
  const p = el.querySelector('p');
  const step = reduceMotion ? 150 : 600;
  lines.forEach((l, i) => setTimeout(() => { p.textContent = l; }, i * step));
  await Promise.all([Promise.race([fetchAllWeather(), sleep(9000)]), sleep(lines.length * step)]);
  el.remove();
  go('plan');
  if (!state.legs.every((l, i) => state.wx[wxKey(l, i)])) toast('Some weather couldn’t load, so those stops show labeled estimates');
}

function validateSetup() {
  const e = {};
  if (!state.start) e.start = 'Pick the day your trip starts.';
  state.legs.forEach(l => {
    if (!l.activity) e['act-' + l.id] = 'Choose an activity for this stop.';
    if (l.activity === 'custom' && !l.custom.trim()) e['custom-' + l.id] = 'Name your activity.';
    if (!l.destination.trim()) e['dest-' + l.id] = 'Add where this stop is.';
  });
  if (!Object.values(state.bags).some(n => n > 0)) e.bags = 'Add at least one bag.';
  state.errors = e;
  return Object.keys(e).length === 0;
}

function loadSample() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  state = blankState();
  uid = 0;
  const concert = { ...newLeg(), activity: 'concert', destination: 'San Jose, CA', days: 1 };
  const hike = { ...newLeg(), activity: 'hiking', destination: 'Yosemite National Park', days: 3 };
  Object.assign(state, {
    start: isoDate(d), legs: [concert, hike], bags: { backpack: 1, medium: 1 },
    workout: { days: 2, kind: 'running' }, lodging: ['hotel'], laundry: 'no', shopping: 'some',
  });
}

/* ---------- Events ---------- */
const findLeg = id => state.legs.find(l => l.id === id);
const clampWorkout = () => { state.workout.days = Math.min(state.workout.days, totalDays()); };

root.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const [cmd, ...rest] = btn.dataset.act.split(':');
  const arg = rest.join(':');

  switch (cmd) {
    case 'home': state.screen = 'home'; render({ newScreen: true }); break;
    case 'start': go('setup'); break;
    case 'sample': loadSample(); generate(); break;
    case 'restart':
      if (state.reached > 0 && !state.finished && !confirm('Start over? Your trip details will be cleared.')) return;
      state = blankState(); render({ newScreen: true }); break;
    case 'go':
      if (arg === 'plan' && state.screen === 'setup') { generate(); break; }
      go(arg); break;
    case 'leg-act': {
      const [id, a] = arg.split(':');
      Object.assign(findLeg(id), { activity: a, picking: false });
      delete state.errors['act-' + id];
      render();
      if (a === 'custom') document.getElementById('leg-custom-' + id)?.focus();
      else document.getElementById('chg-' + id)?.focus();
      break;
    }
    case 'leg-change':
      findLeg(arg).picking = true;
      render();
      document.getElementById(`la-${arg}-${findLeg(arg).activity}`)?.focus();
      break;
    case 'leg-days': {
      const [id, d] = arg.split(':');
      const l = findLeg(id);
      l.days = Math.min(30, Math.max(1, l.days + +d));
      clampWorkout(); render(); break;
    }
    case 'leg-add': {
      const l = newLeg();
      state.legs.push(l);
      render();
      document.getElementById(`la-${l.id}-hiking`)?.closest('.leg')?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      document.getElementById(`leg-dest-${l.id}`)?.focus({ preventScroll: true });
      break;
    }
    case 'leg-del': state.legs = state.legs.filter(l => l.id !== arg); clampWorkout(); render(); break;
    case 'leg-up': case 'leg-down': {
      const i = state.legs.findIndex(l => l.id === arg), j = cmd === 'leg-up' ? i - 1 : i + 1;
      [state.legs[i], state.legs[j]] = [state.legs[j], state.legs[i]];
      render(); break;
    }
    case 'import-sample':
      state.importPreview = { file: 'sample', sample: true, ...parseItinerary(sampleItineraryRows()) };
      render();
      document.getElementById('import-review')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      break;
    case 'import-cancel': state.importPreview = null; render(); break;
    case 'import-apply': {
      const pv = state.importPreview;
      const legs = pv.stops.map(st => ({ ...newLeg(), activity: st.activity, custom: st.custom, destination: st.destination, days: st.days }));
      const blank = l => !l.activity && !l.destination.trim();
      state.legs = arg === 'add' ? [...state.legs.filter(l => !blank(l)), ...legs] : legs;
      if (pv.start && (arg === 'replace' || !state.start)) state.start = pv.start;
      if (pv.workout) state.workout = { kind: pv.workout.kind, days: pv.workout.days === 'all' ? totalDays() : pv.workout.days };
      clampWorkout();
      state.errors = {};
      state.importPreview = null;
      render();
      toast(`Added ${plural(legs.length, 'stop')} from your itinerary`);
      break;
    }
    case 'wk-kind': state.workout.kind = arg; render(); break;
    case 'wk-days': state.workout.days = Math.max(0, Math.min(totalDays(), state.workout.days + +arg)); render(); break;
    case 'lodge':
      state.lodging = state.lodging.includes(arg) ? state.lodging.filter(l => l !== arg) : [...state.lodging, arg];
      render(); break;
    case 'laundry': state.laundry = arg; render(); break;
    case 'shopping': state.shopping = arg; render(); break;
    case 'bag': {
      const [id, d] = arg.split(':');
      state.bags[id] = Math.min(4, Math.max(0, (state.bags[id] || 0) + +d));
      delete state.errors.bags;
      render(); break;
    }
    case 'packing': state.packing = arg; render(); break;
    case 'setup-next': generate(); break;
    case 'group': state.groupBy = arg; state.packGroup = null; render(); break;
    case 'ptab': state.planTab = arg; render(); break;
    case 'bag-open': state.openBags[arg] = !state.openBags[arg]; render(); break;
    case 'pgroup':
      state.packGroup = arg;
      render();
      document.getElementById('pg-h')?.closest('.pack-group')?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      break;
    case 'finish': {
      const left = bagPlan().all.filter(i => i.essential && !isChecked(i));
      if (left.length) {
        toast(`Pack ${plural(left.length, 'more essential')} first: ${left.slice(0, 2).map(i => i.name).join(', ')}${left.length > 2 ? '…' : ''}`);
        const plan = bagPlan();
        const g = packGroups(plan, checklist()).find(g => g.items.some(i => i.key === left[0].key));
        if (g && g.id !== state.packGroup) { state.packGroup = g.id; render(); }
        const first = document.getElementById('chk-' + safeId(left[0].key));
        first?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        first?.focus({ preventScroll: true });
      } else {
        state.finished = true; render(); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      break;
    }
  }
});

root.addEventListener('input', e => {
  const el = e.target;
  const clearErr = k => { if (state.errors[k]) { delete state.errors[k]; el.classList.remove('invalid'); document.getElementById('err-' + k)?.remove(); } };
  if (el.dataset.bind) {
    state[el.dataset.bind] = el.value;
    clearErr(el.dataset.bind);
    save();
  } else if (el.dataset.leg) {
    const l = findLeg(el.dataset.leg);
    l[el.dataset.field] = el.value;
    clearErr((el.dataset.field === 'destination' ? 'dest-' : 'custom-') + l.id);
    save();
  }
});

root.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bind === 'start') {
    render(); // stop dates depend on the start date
  } else if (el.dataset.toggle === 'rain') {
    state.rain = el.checked;
    render();
    toast(el.checked ? 'Previewing rain on every stop' : 'Back to the real forecast');
  } else if (el.dataset.toggle === 'why') {
    state.showWhy = el.checked;
    render();
  } else if (el.dataset.toggle === 'light') {
    state.packing = el.checked ? 'light' : 'balanced';
    render();
  } else if (el.dataset.check) {
    state.checked[el.dataset.check] = el.checked;
    if (!el.checked) state.finished = false;
    render();
  } else if (el.id === 'f-itin' && el.files.length) {
    importFile(el.files[0]);
  }
});

root.addEventListener('keydown', e => {
  if (e.target.id === 'itin-label' && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    document.getElementById('f-itin').click();
  }
});

async function importFile(file) {
  try {
    state.importPreview = { file: file.name, ...parseItinerary(await readItineraryFile(file)) };
  } catch (err) {
    state.importPreview = { file: file.name, error: err.message || 'That file couldn’t be read.' };
  }
  render();
  document.getElementById('import-review')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

render();
