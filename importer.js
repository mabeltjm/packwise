/* Itinerary import: reads .docx / .xlsx (zip + XML, unpacked in the browser), .csv and .txt,
   then pulls out stops with rule-based parsing. No external libraries or network needed. */

/* ---------- File reading ---------- */
async function openZip(buffer) {
  const dv = new DataView(buffer), u8 = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('That file doesn’t look like a Word or Excel document.');
  const entries = {};
  let p = dv.getUint32(eocd + 16, true);
  for (let k = 0, n = dv.getUint16(eocd + 10, true); k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const nameLen = dv.getUint16(p + 28, true);
    entries[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen))] = {
      method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), offset: dv.getUint32(p + 42, true),
    };
    p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return async name => {
    const e = entries[name];
    if (!e) return null;
    const start = e.offset + 30 + dv.getUint16(e.offset + 26, true) + dv.getUint16(e.offset + 28, true);
    const data = u8.subarray(start, start + e.size);
    if (e.method === 0) return new TextDecoder().decode(data);
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser can’t open Word or Excel files. Try saving as CSV.');
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}

const xml = s => new DOMParser().parseFromString(s, 'application/xml');
const kids = (el, name) => [...el.children].filter(c => c.localName === name);
const textOf = el => [...el.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join('');

// Returns rows: arrays of cell strings. Paragraphs become one-cell rows; table rows keep their cells.
async function readDocx(read) {
  const doc = xml(await read('word/document.xml'));
  const body = doc.getElementsByTagNameNS('*', 'body')[0];
  const rows = [];
  for (const el of body.children) {
    if (el.localName === 'p') rows.push([textOf(el)]);
    if (el.localName === 'tbl') kids(el, 'tr').forEach(tr => rows.push(kids(tr, 'tc').map(textOf)));
  }
  return rows;
}

async function readXlsx(read) {
  const ssXml = await read('xl/sharedStrings.xml');
  const shared = ssXml ? [...xml(ssXml).getElementsByTagNameNS('*', 'si')].map(textOf) : [];
  const sheet = xml(await read('xl/worksheets/sheet1.xml'));
  const colIdx = ref => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return [...sheet.getElementsByTagNameNS('*', 'row')].map(row => {
    const cells = [];
    for (const c of kids(row, 'c')) {
      const v = kids(c, 'v')[0]?.textContent ?? '';
      const t = c.getAttribute('t');
      cells[colIdx(c.getAttribute('r') || 'A')] = t === 's' ? shared[+v] : t === 'inlineStr' ? textOf(c) : v;
    }
    return [...cells].map(x => x ?? '');
  });
}

function readCsv(text) {
  return text.split(/\r?\n/).map(line => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  });
}

async function readItineraryFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'doc' || ext === 'xls') throw new Error(`Older .${ext} files aren’t supported. Open it and save as .${ext}x, then try again.`);
  if (ext === 'csv') return readCsv(await file.text());
  if (ext === 'txt') return (await file.text()).split(/\r?\n/).map(l => [l]);
  if (ext !== 'docx' && ext !== 'xlsx') throw new Error('Upload a Word (.docx), Excel (.xlsx), CSV, or text file.');
  const read = await openZip(await file.arrayBuffer());
  return ext === 'docx' ? readDocx(read) : readXlsx(read);
}

/* ---------- Parsing ---------- */
const ACTIVITY_WORDS = [
  ['roadtrip', /\b(road ?trip|scenic drive)\b/i],
  ['themepark', /\b(theme park|amusement park|disneyland|disney world|universal studios|six flags|water park)\b/i],
  ['skiing', /\b(ski|skiing|snowboard|snowboarding|slopes|snowshoe)\b/i],
  ['water', /\b(kayak|kayaking|rafting|paddle ?board|paddleboarding|canoe|canoeing|boating|boat tour|jet ?ski|sailing|snorkel|snorkeling|scuba|diving|water sports?)\b/i],
  ['hiking', /\b(hike|hikes|hiking|trek|trekking|trail|summit|backpacking)\b/i],
  ['camping', /\b(camp|camping|campground|campsite|glamping)\b/i],
  ['beach', /\b(beach|surf|surfing)\b/i],
  ['formal', /\b(wedding|gala|formal|prom|graduation|ceremony)\b/i],
  ['dining', /\b(fine dining|dinner reservation|dinner at|tasting menu|omakase|michelin|restaurant)\b/i],
  ['nightlife', /\b(club|clubbing|nightclub|night ?life|bar hopping|bars|party|rave|night out)\b/i],
  ['crafts', /\b(crafts?|pottery|ceramics|workshop|painting class|candle making|woodworking)\b/i],
  ['sports', /\b(game|match|stadium|ballpark|baseball|football|basketball|soccer|hockey)\b/i],
  ['concert', /\b(concert|festival|gig|live music|show)\b/i],
  ['picnic', /\b(picnic)\b/i],
  ['city', /\b(city|sightseeing|museum|museums|explore|exploring|walking tour|tour|shopping|downtown)\b/i],
];
const WORKOUT_WORDS = [
  ['gym', /\b(gym|workout|work out|lift|lifting|weights)\b/i],
  ['running', /\b(run|runs|running|jog|jogging)\b/i],
  ['yoga', /\b(yoga|pilates)\b/i],
  ['swimming', /\b(swim laps|lap swim|pool)\b/i],
];
const LOGISTICS = /\b(flight|fly|flying|airport|check[- ]?in|check[- ]?out|train to|bus to|drive (to|from|back)|driving (to|from)|travel day|depart|arrive|arrival|return home|head home|pick up|rental car)\b/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const STOP_WORDS = new Set(['day', 'days', 'night', 'nights', 'morning', 'afternoon', 'evening', 'mon', 'monday', 'tue', 'tues', 'tuesday', 'wed', 'wednesday', 'thu', 'thur', 'thurs', 'thursday', 'fri', 'friday', 'sat', 'saturday', 'sun', 'sunday', 'the', 'a', 'an', 'then', 'and']);

const pad = n => String(n).padStart(2, '0');
// Dates without a year are assumed to be the next upcoming one.
function mkDate(y, m, d) {
  if (!y) {
    const now = new Date(), t = new Date(now.getFullYear(), m - 1, d);
    y = t < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? now.getFullYear() + 1 : now.getFullYear();
  }
  if (y < 100) y += 2000;
  return `${y}-${pad(m)}-${pad(d)}`;
}
const monthNum = s => MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;
const excelSerial = n => { const d = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);

// Finds the first date (and an optional range end) in a string. Returns { date, end, match }.
function findDate(s) {
  const tries = [
    [new RegExp(`\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b`), m => mkDate(+m[1], +m[2], +m[3]), null],
    [new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'i'), m => mkDate(m[3] && +m[3], monthNum(m[1]), +m[2]), m => monthNum(m[1])],
    [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON}(?:,?\\s+(\\d{4}))?`, 'i'), m => mkDate(m[3] && +m[3], monthNum(m[2]), +m[1]), m => monthNum(m[2])],
    [/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, m => mkDate(m[3] && +m[3], +m[1], +m[2]), m => +m[1]],
  ];
  for (const [re, toIso, monthOf] of tries) {
    const m = s.match(re);
    if (!m) continue;
    const date = toIso(m);
    let end = null, full = m[0];
    const after = s.slice(m.index + m[0].length);
    const r = after.match(new RegExp(`^\\s*(?:-|–|—|to|through|thru|until)\\s*(?:${MON}\\s+)?(\\d{1,2})\\b`, 'i'));
    if (r && monthOf) {
      let y = +date.slice(0, 4), mo = r[1] ? monthNum(r[1]) : monthOf(m);
      if (!r[1] && +r[2] < +date.slice(8)) mo++; // "Oct 31–3" runs into the next month
      if (mo > 12) { mo = 1; y++; }
      end = `${y}-${pad(mo)}-${pad(+r[2])}`;
      if (end < date) end = `${y + 1}${end.slice(4)}`;
      full += r[0];
    }
    return { date, end, match: full };
  }
  return null;
}

function findDays(s) {
  const m = s.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(days?|nights?)\b/i);
  if (!m) return null;
  return { days: NUM_WORDS[m[1].toLowerCase()] || +m[1], match: m[0] };
}

function findPlace(s) {
  // Prefer "in <city>" over "at <venue>", since weather lookups need a town or park.
  const all = [...s.matchAll(/\b(in|at|near|around|to|@)\s+([A-Z][\w'’.&-]*(?:\s+(?:[A-Z][\w'’.&-]*|of|de|la|del|du))*(?:\s*,\s*[A-Z][\w.]*(?:\s+[A-Z][\w.]*)*)?)/g)];
  const m = all.find(x => x[1] === 'in') || all[0];
  if (m) return { place: m[2].replace(/\s+(of|de|la|del|du)$/, ''), match: m[0] };
  // Fall back to the first run of capitalized words that isn't a weekday, month, or activity word.
  for (const seq of s.match(/[A-Z][\w'’.&-]*(?:\s+[A-Z][\w'’.&-]*)*(?:\s*,\s*[A-Z]{2}\b)?/g) || []) {
    const words = seq.split(/\s+/);
    while (words.length && (STOP_WORDS.has(words[0].toLowerCase().replace(/[.,:]/g, '')) || MONTHS.includes(words[0].slice(0, 3).toLowerCase()) ||
      ACTIVITY_WORDS.some(([, re]) => re.test(words[0])) || WORKOUT_WORDS.some(([, re]) => re.test(words[0])))) words.shift();
    if (words.length) return { place: words.join(' ').replace(/[.:;]$/, ''), match: seq };
  }
  return null;
}

const HEADERS = {
  date: /^(date|dates|day|when|start)\b/i,
  activity: /(activit|what|event|plan|description|details|itinerary)/i,
  place: /(location|destination|where|city|place|venue|park|region)/i,
  days: /(days|duration|length|nights|how long)/i,
};

function headerMap(row) {
  const map = {};
  row.forEach((cell, i) => {
    const c = String(cell).trim();
    if (!c || c.length > 30) return;
    for (const [k, re] of Object.entries(HEADERS)) if (!(k in map) && re.test(c)) { map[k] = i; break; }
  });
  return Object.keys(map).length >= 2 ? map : null;
}

function parseItinerary(rows) {
  const stops = [], skipped = [];
  let workout = null, cols = null;

  for (const raw of rows) {
    const cells = raw.map(c => String(c ?? '').trim());
    if (!cells.some(Boolean)) continue;
    if (cells.length > 1) {
      const h = headerMap(cells);
      if (h) { cols = h; continue; }
    }
    const tableRow = cols && cells.length > 1;
    const line = cells.filter(Boolean).join(' · ');
    const actText = tableRow && cols.activity != null ? cells[cols.activity] : line;

    // Date
    let dateInfo = null;
    if (tableRow && cols.date != null && cells[cols.date]) {
      const v = cells[cols.date];
      dateInfo = /^\d{5}(\.\d+)?$/.test(v) ? { date: excelSerial(+v), end: null, match: '' } : findDate(v);
    } else dateInfo = findDate(line);

    // Duration
    let days = null;
    if (tableRow && cols.days != null && cells[cols.days]) days = parseInt(cells[cols.days], 10) || findDays(cells[cols.days])?.days || null;
    else days = findDays(actText)?.days ?? null;
    if (!days && dateInfo?.end) days = dayDiff(dateInfo.date, dateInfo.end) + 1;
    const dayIdx = +(line.match(/\bday\s+(\d+)\b/i)?.[1] || 0) || null;

    // Strip dates, durations, and "Day N" before looking for activities and places.
    let rest = actText;
    if (dateInfo?.match) rest = rest.replace(dateInfo.match, ' ');
    rest = rest.replace(/\(?\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(days?|nights?)\)?/ig, ' ').replace(/\bday\s+\d+\b/ig, ' ').replace(/^[\s:–—\-·|,]+/, '').trim();

    const activity = ACTIVITY_WORDS.find(([, re]) => re.test(rest))?.[0];
    const placeInfo = tableRow && cols.place != null && cells[cols.place] ? { place: cells[cols.place], match: '' } : findPlace(rest);

    if (activity) {
      stops.push({ activity, custom: '', destination: placeInfo?.place || '', days, date: dateInfo?.date || null, dayIdx, source: line });
      continue;
    }
    const wk = WORKOUT_WORDS.find(([, re]) => re.test(rest));
    if (wk) {
      const every = /\b(every ?day|daily|every (morning|evening|night)|each (morning|day|evening))\b/i.test(rest);
      const times = +(rest.match(/\b(\d+)\s*(x|times)\b/i)?.[1] || 0);
      workout = { kind: wk[0], days: every ? 'all' : times || ((workout?.days | 0) + 1), source: line };
      continue;
    }
    if (LOGISTICS.test(rest)) { skipped.push({ line, why: 'Travel logistics' }); continue; }
    if (placeInfo?.place) {
      const name = rest.split(placeInfo.match || placeInfo.place)[0].replace(/[\s:–—\-·|,]+$/, '').trim();
      if (name && name.length <= 40) {
        stops.push({ activity: 'custom', custom: name[0].toUpperCase() + name.slice(1), destination: placeInfo.place, days, date: dateInfo?.date || null, dayIdx, source: line });
        continue;
      }
    }
    skipped.push({ line, why: 'No activity found' });
  }

  // Fill in missing lengths from the next stop's date or day number, then merge back-to-back repeats.
  stops.forEach((s, i) => {
    if (s.days) return;
    const next = stops[i + 1];
    if (s.date && next?.date && next.date > s.date) s.days = dayDiff(s.date, next.date);
    else if (s.dayIdx && next?.dayIdx > s.dayIdx) s.days = next.dayIdx - s.dayIdx;
    else s.days = 1;
  });
  const merged = [];
  stops.forEach(s => {
    const prev = merged[merged.length - 1];
    if (prev && prev.activity === s.activity && prev.custom === s.custom && prev.destination.toLowerCase() === s.destination.toLowerCase()) {
      prev.days += s.days; prev.source += '\n' + s.source;
    } else merged.push({ ...s, days: Math.min(30, Math.max(1, s.days)) });
  });

  // Start date: the first dated stop, minus the days of any undated stops before it.
  let start = null;
  const di = merged.findIndex(s => s.date);
  if (di >= 0) {
    const d = new Date(merged[di].date + 'T00:00');
    d.setDate(d.getDate() - merged.slice(0, di).reduce((n, s) => n + s.days, 0));
    start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return { stops: merged, skipped, workout, start };
}

// Built-in example so the import can be demoed without a file. Dates sit inside the forecast window.
function sampleItineraryRows() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  const f = n => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
  const md = n => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  return [
    ['Weekend away'],
    [`${f(0)}: Fly into SJC, pick up rental car`],
    [`${f(0)}: Concert in San Jose, CA`],
    [`${f(1)}: Drive to Yosemite`],
    [`${md(1)} – ${md(3)}: Hiking in Yosemite National Park (3 days)`],
    ['Gym at the hotel every morning'],
  ];
}
