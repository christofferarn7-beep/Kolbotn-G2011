'use strict';

/*
 * Kolbotn G2011 – lagets nettside for TG1.
 * Ren JavaScript uten eksterne biblioteker. Innlogging og data ligger hos Supabase (EU).
 * Tilgang styres i databasen: spillere ser seg selv og felles innhold, foreldre ser felles
 * innhold og gir samtykke, trenerne ser og endrer alt.
 */

const KONFIG = {
  url: 'https://vuptixwhbeykgchasafj.supabase.co',
  nokkel: 'sb_publishable_vPkmCpoGKglwHVimm5V_1A_QSqpE_SP',
  epostDomene: 'brukere.kolbotn-g2011.invalid',
  samtykkeVersjon: '2026-11',
  lagring: 'kolbotn-g2011-okt'
};

const TZ = 'Europe/Oslo';
const DAGER = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const DAG_KORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const BRUKERNAVN_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const DAG_MS = 86400000;

const ROLLE_NAVN = { spiller: 'Spiller', forelder: 'Forelder', trener: 'Trener' };
const POSISJON_NAVN = { keeper: 'Keeper', back: 'Back', stopper: 'Stopper', midtbane: 'Midtbane', kant: 'Kant', spiss: 'Spiss' };
const SONE = {
  'rød': { klasse: 'sone-rod', navn: 'Rød', tiltak: 'Vurder å ta bort én økt, gjerne en hard ekstraøkt. Kort ned spilldelen og reduser hopp når totalbelastningen tilsier det. Ta som utgangspunkt ut den planlagte sprintbolken.' },
  'gul': { klasse: 'sone-gul', navn: 'Gul', tiltak: 'Kort ned spilldelen på én til to økter. Reduser sprintdrag og hopp, fra to hoppserier til én. Bruk rolig teknikk eller tilpasset styrke i stedet for deler av spillet.' },
  'grønn': { klasse: 'sone-gronn', navn: 'Grønn', tiltak: 'Følg lagets opplegg. Tilpass ved smerter eller høy totalbelastning, for eksempel mye trening på skolen.' },
  'mangler': { klasse: 'sone-mangler', navn: 'Mangler', tiltak: 'Trenger minst to målinger før sonen kan regnes ut.' }
};
const SONE_REKKEFOLGE = { 'rød': 0, 'gul': 1, 'mangler': 2, 'grønn': 3 };
const SPESIELLE_SEKSJONER = ['grunnformasjon', 'felles språk', 'tekniske standarder'];

/* Logg etter økt og utviklingsmål */
const LOGG_TYPER = ['trening', 'fysisk', 'kamp', 'cup'];
const LOGG_DAGER = 7;
const SMERTE_NAVN = { nei: 'Nei', litt: 'Litt', mye: 'Mye' };
const MAL_STATUS = {
  aktiv: { navn: 'Aktiv', klasse: '' },
  'nådd': { navn: 'Nådd', klasse: 'sone-gronn' },
  delvis: { navn: 'Delvis', klasse: 'sone-gul' },
  ikke_nådd: { navn: 'Ikke nådd', klasse: 'sone-mangler' }
};
const BRA_EKSEMPEL = ['F.eks. vant mange andreballer', 'F.eks. turte å bruke venstre', 'F.eks. snakket mye bakover'];

/* Min kalender */
const KAL_KATEGORI = {
  skole: { navn: 'Skole', klasse: 'kat-skole' },
  kroppsoving: { navn: 'Kroppsøving', klasse: 'kat-belastning' },
  trening: { navn: 'Annen trening', klasse: 'kat-belastning' },
  kamp: { navn: 'Kamp', klasse: 'kat-belastning' },
  mat: { navn: 'Måltid', klasse: 'kat-mat' },
  sovn: { navn: 'Søvn', klasse: 'kat-sovn' },
  annet: { navn: 'Annet', klasse: 'kat-annet' }
};
const BELASTNING_KAT = ['kroppsoving', 'trening', 'kamp'];
const UKEDAG_LANG = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const UKEDAG_KORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

/* Egentrening */
const PROGRAM_GRUPPER = [['ball', 'Med ball'], ['sprint', 'Sprint'], ['styrke', 'Styrke'], ['annet', 'Annet']];

/* Lagets kalender: typer og status slik databasen tillater dem, og det en ny økt starter med. */
const HENDELSE_TYPE = { trening: 'Trening', kamp: 'Kamp', cup: 'Cup', fysisk: 'Fysisk', 'møte': 'Møte', fri: 'Fri', annet: 'Annet' };
const HENDELSE_STATUS = { bekreftet: 'Bekreftet', planlagt: 'Planlagt', avlyst: 'Avlyst' };
const STANDARD_TITTEL = { trening: 'Fellestrening', kamp: 'Kamp', cup: 'Cup', fysisk: 'Fysisk trening', 'møte': 'Møte', fri: 'Fri', annet: 'Aktivitet' };
const NY_OKT = { oppmote: '16:30', start: '16:45', slutt: '18:00', sted: 'Sofiemyr kunstgress' };
const MAKS_UKER = 26;
const DATO_RE = /^\d{4}-\d{2}-\d{2}$/;
const TID_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const IKON = {
  hus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  kalender: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  bane: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/></svg>',
  person: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  tavle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>',
  klokke: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  sted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  tema: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  hvorfor: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/></svg>',
  motstander: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  sjekk: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  uke: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  meny: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
  vekt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  lyspaere: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.5 1.1-2.1A6 6 0 0 0 12 3z"/></svg>'
};

/* ---------- Hjelpefunksjoner ---------- */

function esc(verdi) {
  return String(verdi == null ? '' : verdi)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mdInline(tekst) {
  return tekst
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
}

/* Enkel markdown: ## og ### overskrifter, lister med - og avsnitt. Teksten escapes først. */
function md(tekst) {
  const linjer = esc(tekst || '').split('\n');
  let html = '';
  let iListe = false;
  let avsnitt = [];
  const skrivAvsnitt = () => {
    if (avsnitt.length) {
      html += '<p>' + mdInline(avsnitt.join(' ')) + '</p>';
      avsnitt = [];
    }
  };
  const lukkListe = () => {
    if (iListe) {
      html += '</ul>';
      iListe = false;
    }
  };
  /* Enkle tabeller: | a | b |, første rad er overskrift, skillelinjen med --- hoppes over. */
  let tabell = [];
  const skrivTabell = () => {
    if (!tabell.length) return;
    const [hode, ...rader] = tabell;
    html += '<div class="tabell"><table><thead><tr>' + hode.map((c) => '<th>' + mdInline(c) + '</th>').join('') + '</tr></thead>'
      + (rader.length ? '<tbody>' + rader.map((r) => '<tr>' + r.map((c) => '<td>' + mdInline(c) + '</td>').join('') + '</tr>').join('') + '</tbody>' : '')
      + '</table></div>';
    tabell = [];
  };
  for (const linje of linjer) {
    const t = linje.trim();
    if (t.length > 1 && t.startsWith('|') && t.endsWith('|')) {
      skrivAvsnitt();
      lukkListe();
      const celler = t.slice(1, -1).split('|').map((c) => c.trim());
      if (!celler.every((c) => /^:?-{3,}:?$/.test(c))) tabell.push(celler);
      continue;
    }
    skrivTabell();
    if (!t) {
      skrivAvsnitt();
      lukkListe();
      continue;
    }
    let m = t.match(/^(#{2,3})\s+(.*)$/);
    if (m) {
      skrivAvsnitt();
      lukkListe();
      const tag = m[1].length === 2 ? 'h2' : 'h3';
      html += '<' + tag + '>' + mdInline(m[2]) + '</' + tag + '>';
      continue;
    }
    m = t.match(/^[-*]\s+(.*)$/);
    if (m) {
      skrivAvsnitt();
      if (!iListe) {
        html += '<ul>';
        iListe = true;
      }
      html += '<li>' + mdInline(m[1]) + '</li>';
      continue;
    }
    lukkListe();
    avsnitt.push(t);
  }
  skrivTabell();
  skrivAvsnitt();
  lukkListe();
  return html;
}

/* Deler en markdown-tekst i seksjoner etter ## overskrifter. */
function seksjoner(tekst) {
  const deler = [];
  let naa = { tittel: '', linjer: [] };
  for (const linje of String(tekst || '').split('\n')) {
    const m = linje.match(/^##\s+(.*)$/);
    if (m) {
      deler.push(naa);
      naa = { tittel: m[1].trim(), linjer: [] };
    } else {
      naa.linjer.push(linje);
    }
  }
  deler.push(naa);
  return deler
    .map((d) => ({ tittel: d.tittel, tekst: d.linjer.join('\n').trim() }))
    .filter((d) => d.tittel || d.tekst);
}

function listepunkter(tekst) {
  return String(tekst || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ''));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function stor(tekst) {
  return tekst ? tekst.charAt(0).toUpperCase() + tekst.slice(1) : tekst;
}

const OSLO_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function osloDeler(dato) {
  const p = {};
  for (const del of OSLO_FMT.formatToParts(dato)) p[del.type] = del.value;
  return { aar: Number(p.year), mnd: Number(p.month), dag: Number(p.day), time: p.hour, min: p.minute };
}

function osloDatoStr(dato) {
  const o = osloDeler(dato);
  return o.aar + '-' + pad(o.mnd) + '-' + pad(o.dag);
}

function idagStr() {
  return osloDatoStr(new Date());
}

function datoFraStr(s) {
  return new Date(String(s).slice(0, 10) + 'T00:00:00Z');
}

/* Mandag (som UTC-midnatt) i uka et tidspunkt hører til, regnet i norsk tid. */
function mandagFor(dato) {
  const o = osloDeler(dato);
  const u = new Date(Date.UTC(o.aar, o.mnd - 1, o.dag));
  const dagNr = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() - (dagNr - 1));
  return u;
}

function isoUke(u) {
  const d = new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()));
  const dagNr = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dagNr);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - start) / DAG_MS + 1) / 7);
}

function ukeTekst(mandag) {
  const son = new Date(mandag.getTime() + 6 * DAG_MS);
  const a = mandag.getUTCDate();
  const am = mandag.getUTCMonth();
  const b = son.getUTCDate();
  const bm = son.getUTCMonth();
  return am === bm ? a + '.–' + b + '. ' + MND[am] : a + '. ' + MND[am] + '–' + b + '. ' + MND[bm];
}

function dagInfo(tidspunkt) {
  const o = osloDeler(new Date(tidspunkt));
  const ukedag = new Date(Date.UTC(o.aar, o.mnd - 1, o.dag)).getUTCDay();
  return {
    kort: DAG_KORT[ukedag],
    dato: pad(o.dag) + '.' + pad(o.mnd),
    lang: stor(DAGER[ukedag]) + ' ' + o.dag + '. ' + MND[o.mnd - 1]
  };
}

function klokke(tidspunkt) {
  const o = osloDeler(new Date(tidspunkt));
  return o.time + '.' + o.min;
}

function tidTekst(h) {
  return h.ends_at ? klokke(h.starts_at) + '–' + klokke(h.ends_at) : klokke(h.starts_at);
}

/* Dato og klokkeslett i norsk tid («2026-11-24», «16:45») til et tidspunkt, med sommer- og vintertid. */
function osloTidspunkt(datoStr, tid) {
  const [aar, mnd, dag] = datoStr.split('-').map(Number);
  const [time, min] = tid.split(':').map(Number);
  const onsket = Date.UTC(aar, mnd - 1, dag, time, min);
  let tidspunkt = onsket;
  for (let i = 0; i < 2; i++) {
    const o = osloDeler(new Date(tidspunkt));
    tidspunkt += onsket - Date.UTC(o.aar, o.mnd - 1, o.dag, Number(o.time), Number(o.min));
  }
  return new Date(tidspunkt);
}

/* Samme ukedag hver uke fra og med én dato til og med en annen. Stopper like over taket. */
function ukentligeDatoer(fra, til) {
  const datoer = [];
  for (let d = datoFraStr(fra); datoer.length <= MAKS_UKER; d = new Date(d.getTime() + 7 * DAG_MS)) {
    const s = d.toISOString().slice(0, 10);
    if (s > til) break;
    datoer.push(s);
  }
  return datoer;
}

/* Klokkeslett fra et skjema som «16:45», tomt som null. Ugyldig gir feilmeldingen. */
function tidVerdi(verdi, feilmelding) {
  const t = String(verdi == null ? '' : verdi).trim();
  if (!t) return null;
  if (!TID_RE.test(t)) throw new Error(feilmelding);
  return t.slice(0, 5);
}

function inputTid(tidspunkt) {
  return tidspunkt ? klokke(tidspunkt).replace('.', ':') : '';
}

function datoTekst(s) {
  const d = datoFraStr(s);
  return d.getUTCDate() + '. ' + MND[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function datoUtenAar(s) {
  const d = datoFraStr(s);
  return d.getUTCDate() + '. ' + MND[d.getUTCMonth()];
}

function sisteDagIMnd(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

function periodeTekst(p) {
  const s = datoFraStr(p.start_date);
  const e = datoFraStr(p.end_date);
  const helMnd = s.getUTCDate() === 1 && e.getUTCDate() === sisteDagIMnd(e)
    && s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  if (helMnd) return stor(MND[s.getUTCMonth()]) + ' ' + s.getUTCFullYear();
  if (s.getUTCFullYear() === e.getUTCFullYear()) {
    return s.getUTCDate() + '. ' + MND[s.getUTCMonth()] + '–' + e.getUTCDate() + '. ' + MND[e.getUTCMonth()] + ' ' + e.getUTCFullYear();
  }
  return datoTekst(p.start_date) + '–' + datoTekst(p.end_date);
}

function periodeKortTekst(p) {
  const s = datoFraStr(p.start_date);
  const e = datoFraStr(p.end_date);
  if (s.getUTCDate() === 1 && e.getUTCDate() === sisteDagIMnd(e) && s.getUTCMonth() === e.getUTCMonth()) {
    return MND_KORT[s.getUTCMonth()];
  }
  return s.getUTCDate() + '. ' + MND_KORT[s.getUTCMonth()] + '–' + e.getUTCDate() + '. ' + MND_KORT[e.getUTCMonth()];
}

function periodeMnd(p) {
  const s = datoFraStr(p.start_date).getUTCMonth();
  const e = datoFraStr(p.end_date).getUTCMonth();
  return s === e ? MND_KORT[s] : MND_KORT[s] + '–' + MND_KORT[e];
}

function periodeNavn(p) {
  const deler = String(p.title || '').split(' – ');
  if (deler.length > 1) return { kort: deler[0].trim(), navn: deler.slice(1).join(' – ').trim() };
  return { kort: p.id === 'SOMMER' ? 'Sommer' : p.id, navn: p.title || p.id };
}

function periodeFor(perioder, datoStr) {
  return perioder.find((p) => p.start_date <= datoStr && datoStr <= p.end_date)
    || perioder.find((p) => p.start_date > datoStr)
    || null;
}

/* Perioden en ny økt hører til. Mellom to perioder, som i jula, havner den i perioden før. */
function periodeIdFor(perioder, datoStr) {
  const inni = perioder.find((p) => p.start_date <= datoStr && datoStr <= p.end_date);
  if (inni) return inni.id;
  const tidligere = perioder.filter((p) => p.end_date < datoStr);
  const p = tidligere.length ? tidligere[tidligere.length - 1] : perioder.find((x) => x.start_date > datoStr);
  return p ? p.id : null;
}

function standardTittel(type, motstander) {
  if (type === 'kamp' && motstander) return 'Kamp mot ' + motstander;
  return STANDARD_TITTEL[type] || 'Aktivitet';
}

function sluttTid(h) {
  return new Date(h.ends_at || h.starts_at);
}

function tallFraTekst(tekst) {
  const t = String(tekst || '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d{2,3}(\.\d)?$/.test(t)) return NaN;
  return Number(t);
}

const TALL_FMT = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function cm(verdi) {
  return TALL_FMT.format(Number(verdi));
}

function medFortegn(verdi) {
  const v = Number(verdi);
  return (v > 0 ? '+' : v < 0 ? '−' : '') + TALL_FMT.format(Math.abs(v));
}

function normalisertBrukernavn(s) {
  return String(s || '').trim().toLowerCase();
}

function normalisertKode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function visKode(kode) {
  return kode.slice(0, 5) + ' ' + kode.slice(5);
}

function sjekkPassord(a, b) {
  if (!a || a.length < 8) throw new Error('Passordet må ha minst 8 tegn.');
  if (a.length > 72) throw new Error('Passordet kan ha maks 72 tegn.');
  if (a !== b) throw new Error('Passordene er ikke like.');
}

function dagerSiden(datoStr) {
  return Math.round((datoFraStr(idagStr()) - datoFraStr(datoStr)) / DAG_MS);
}

function heltall(tekst) {
  const t = String(tekst == null ? '' : tekst).trim();
  return /^\d{1,3}$/.test(t) ? Number(t) : NaN;
}

function tekstFelt(verdi) {
  const t = String(verdi == null ? '' : verdi).trim();
  return t || null;
}

/* Parametre etter ? i adressen, for eksempel #/logg?okt=… */
function ruteParam(navn) {
  const i = location.hash.indexOf('?');
  if (i < 0) return '';
  return new URLSearchParams(location.hash.slice(i + 1)).get(navn) || '';
}

function minutterFor(h) {
  if (!h.ends_at) return 75;
  return Math.max(1, Math.round((new Date(h.ends_at) - new Date(h.starts_at)) / 60000));
}

/* Samme regel som i databasen: økta har startet, er ikke avlyst og sluttet for maks sju dager siden. */
function kanLogges(h) {
  const naa = Date.now();
  return LOGG_TYPER.includes(h.kind) && h.status !== 'avlyst'
    && new Date(h.starts_at).getTime() <= naa
    && sluttTid(h).getTime() >= naa - LOGG_DAGER * DAG_MS;
}

/* Perioder spillerne kan sette mål for: den som pågår (eller neste) og perioden etter. */
function apnePerioder() {
  const idag = idagStr();
  return S.perioder.filter((p) => p.end_date >= idag).slice(0, 2);
}

function periodeTittel(id) {
  const p = S.perioder.find((x) => x.id === id);
  if (!p) return id;
  const pn = periodeNavn(p);
  return pn.kort + ' – ' + pn.navn;
}

function belastning(l) {
  return l.rpe * l.minutes;
}

function snitt(tall) {
  return tall.length ? tall.reduce((a, b) => a + b, 0) / tall.length : 0;
}

function desimal(v) {
  return TALL_FMT.format(v);
}

function sideAdresse() {
  return location.origin + location.pathname;
}

function invitasjonTekst(kode, type) {
  if (type === 'passord') {
    return 'Hei! Her er en kode for å lage nytt passord på lagets nettside for Kolbotn G2011: ' + kode
      + '\n\nGå til ' + sideAdresse() + ', trykk «Glemt passord?» og velg et nytt passord. Koden gjelder i 14 dager.';
  }
  return 'Hei! Her er koden din til lagets nettside for Kolbotn G2011: ' + kode
    + '\n\nGå til ' + sideAdresse() + ', trykk «Første gang?» og lag ditt eget brukernavn og passord. Koden gjelder i 14 dager.';
}

/* ---------- Supabase ---------- */

class ApiFeil extends Error {
  constructor(melding, status, kode) {
    super(melding);
    this.status = status;
    this.kode = kode;
  }
}

const api = {
  okt: null,

  hentLagret() {
    try {
      this.okt = JSON.parse(localStorage.getItem(KONFIG.lagring));
    } catch (e) {
      this.okt = null;
    }
    return this.okt;
  },

  settOkt(okt) {
    this.okt = okt;
    try {
      if (okt) localStorage.setItem(KONFIG.lagring, JSON.stringify(okt));
      else localStorage.removeItem(KONFIG.lagring);
    } catch (e) {
      /* privat modus: økta varer til siden lukkes */
    }
  },

  async auth(sti, kropp, token) {
    const hoder = { apikey: KONFIG.nokkel, 'Content-Type': 'application/json' };
    if (token) hoder.Authorization = 'Bearer ' + token;
    const svar = await fetch(KONFIG.url + '/auth/v1/' + sti, { method: 'POST', headers: hoder, body: JSON.stringify(kropp || {}) });
    const data = await svar.json().catch(() => ({}));
    if (!svar.ok) throw new ApiFeil(data.msg || data.error_description || data.message || 'Innloggingen feilet.', svar.status, data.error_code);
    return data;
  },

  lagOkt(data) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      utloper: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      bruker: data.user ? data.user.id : this.okt && this.okt.bruker
    };
  },

  async loggInn(brukernavn, passord) {
    const data = await this.auth('token?grant_type=password', {
      email: brukernavn + '@' + KONFIG.epostDomene,
      password: passord
    });
    this.settOkt(this.lagOkt(data));
  },

  async fornye() {
    if (!this.okt || !this.okt.refresh_token) throw new ApiFeil('Du er logget ut.', 401);
    try {
      const data = await this.auth('token?grant_type=refresh_token', { refresh_token: this.okt.refresh_token });
      this.settOkt(this.lagOkt(data));
    } catch (e) {
      if (e instanceof ApiFeil) {
        this.settOkt(null);
        throw new ApiFeil('Du er logget ut. Logg inn på nytt.', 401);
      }
      throw e;
    }
  },

  async token() {
    if (!this.okt) throw new ApiFeil('Du er logget ut.', 401);
    if (this.okt.utloper - 60 < Date.now() / 1000) await this.fornye();
    return this.okt.access_token;
  },

  async loggUt() {
    const token = this.okt && this.okt.access_token;
    this.settOkt(null);
    if (!token) return;
    try {
      await fetch(KONFIG.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: KONFIG.nokkel, Authorization: 'Bearer ' + token } });
    } catch (e) {
      /* ingen nett: økta er uansett slettet lokalt */
    }
  },

  async rest(sti, valg) {
    const v = valg || {};
    const kjor = async () => {
      const hoder = { apikey: KONFIG.nokkel, Authorization: 'Bearer ' + (await this.token()), 'Content-Type': 'application/json' };
      if (v.prefer) hoder.Prefer = v.prefer;
      return fetch(KONFIG.url + '/rest/v1/' + sti, {
        method: v.metode || 'GET',
        headers: hoder,
        body: v.kropp === undefined ? undefined : JSON.stringify(v.kropp)
      });
    };
    let svar = await kjor();
    if (svar.status === 401) {
      await this.fornye();
      svar = await kjor();
    }
    if (svar.status === 204) return null;
    const tekst = await svar.text();
    let data = null;
    if (tekst) {
      try {
        data = JSON.parse(tekst);
      } catch (e) {
        data = null;
      }
    }
    if (!svar.ok) throw new ApiFeil((data && (data.message || data.msg)) || 'Feil fra databasen.', svar.status, data && data.code);
    return data;
  },

  async brukerOppdater(kropp) {
    const svar = await fetch(KONFIG.url + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: KONFIG.nokkel, Authorization: 'Bearer ' + (await this.token()), 'Content-Type': 'application/json' },
      body: JSON.stringify(kropp)
    });
    const data = await svar.json().catch(() => ({}));
    if (!svar.ok) throw new ApiFeil(data.msg || 'Kunne ikke lagre.', svar.status, data.error_code);
    return data;
  },

  async funksjon(navn, kropp) {
    const svar = await fetch(KONFIG.url + '/functions/v1/' + navn, {
      method: 'POST',
      headers: { apikey: KONFIG.nokkel, 'Content-Type': 'application/json' },
      body: JSON.stringify(kropp)
    });
    const data = await svar.json().catch(() => ({}));
    if (!svar.ok || !data.ok) throw new ApiFeil(data.feil || 'Noe gikk galt. Prøv igjen.', svar.status);
    return data;
  }
};

function feiltekst(feil) {
  if (feil instanceof ApiFeil) {
    if (feil.kode === 'invalid_credentials') return 'Feil brukernavn eller passord.';
    if (feil.kode === 'weak_password') return 'Passordet er for svakt. Velg et lengre passord.';
    if (feil.kode === 'same_password') return 'Det nye passordet må være forskjellig fra det gamle.';
    if (feil.kode === '42501' || /row-level security/i.test(feil.message)) return 'Du har ikke tilgang til å gjøre dette.';
    if (feil.status === 401) return 'Du er logget ut. Logg inn på nytt.';
    return feil.message;
  }
  if (feil instanceof TypeError) return 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.';
  return (feil && feil.message) || 'Noe gikk galt.';
}

/* ---------- Tilstand og lasting ---------- */

const S = {
  profil: null,
  perioder: [],
  hendelser: [],
  sider: {},
  spiller: null,
  samtykker: [],
  hoyder: [],
  logger: [],
  mal: [],
  kalender: [],
  programmer: [],
  inspirasjon: [],
  barn: [],
  samtaler: [],
  samtaleTider: [],
  samtaleSvar: [],
  samtaleFeil: false,
  trener: null,
  lastFeil: ''
};

const UI = {
  periode: null,
  fase: null,
  kodeResultat: null,
  melding: '',
  forrigeRute: '',
  visSom: null,
  ekte: null
};

function nullstill() {
  S.profil = null;
  S.perioder = [];
  S.hendelser = [];
  S.sider = {};
  S.spiller = null;
  S.samtykker = [];
  S.hoyder = [];
  S.logger = [];
  S.mal = [];
  S.kalender = [];
  S.programmer = [];
  S.inspirasjon = [];
  S.barn = [];
  S.samtaler = [];
  S.samtaleTider = [];
  S.samtaleSvar = [];
  S.samtaleFeil = false;
  S.trener = null;
  S.lastFeil = '';
  UI.periode = null;
  UI.fase = null;
  UI.kodeResultat = null;
  UI.melding = '';
  UI.visSom = null;
  UI.ekte = null;
}

async function lastAlt() {
  S.lastFeil = '';
  const uid = api.okt.bruker;
  const profiler = await api.rest('profiles?select=id,username,full_name,role,player_id&id=eq.' + encodeURIComponent(uid));
  S.profil = (profiler && profiler[0]) || null;
  if (!S.profil) return;
  const [perioder, hendelser, sider, programmer, inspirasjon] = await Promise.all([
    api.rest('periods?select=*&order=start_date.asc'),
    api.rest('events?select=*&order=starts_at.asc'),
    api.rest('pages?select=slug,title,body,audience,sort&order=sort.asc'),
    api.rest('programs?select=*&order=sort.asc'),
    api.rest('inspiration?select=*&order=created_at.desc&limit=200')
  ]);
  S.perioder = perioder || [];
  S.hendelser = hendelser || [];
  S.programmer = programmer || [];
  S.inspirasjon = inspirasjon || [];
  S.sider = {};
  for (const side of sider || []) S.sider[side.slug] = side;
  /* Samtaletidene hentes samtidig. Feiler de, virker resten av siden likevel. */
  const samtaler = hentSamtaler().then(() => null, (feil) => feil);
  if (S.profil.role === 'spiller') await lastSpiller();
  if (S.profil.role === 'forelder') await lastForelder();
  if (S.profil.role === 'trener') await lastTrener();
  const samtaleFeil = await samtaler;
  if (samtaleFeil) {
    if (samtaleFeil instanceof ApiFeil && samtaleFeil.status === 401) throw samtaleFeil;
    S.samtaleFeil = true;
  }
}

/* Runder, ledige tider (uten navn) og egne svar. Treneren får i tillegg hvem som har hvilken tid. */
async function hentSamtaler() {
  const [runder, tider, svar] = await Promise.all([
    api.rest('samtaler?select=*&order=created_at.desc'),
    api.rest('rpc/samtale_tider_status', { metode: 'POST', kropp: {} }),
    api.rest('samtale_svar?select=*')
  ]);
  S.samtaler = runder || [];
  S.samtaleTider = tider || [];
  S.samtaleSvar = svar || [];
  S.samtaleFeil = false;
}

async function lastSamtaler() {
  const trener = erTrener() && !UI.visSom && S.trener;
  await Promise.all([
    hentSamtaler(),
    trener ? api.rest('samtale_tider?select=*&order=starts_at.asc').then((rader) => { S.trener.samtaleTider = rader || []; }) : null
  ]);
}

async function lastSpiller() {
  const pid = encodeURIComponent(S.profil.player_id);
  const [spillere, samtykker, hoyder, logger, mal, kalender] = await Promise.all([
    api.rest('players?select=id,full_name,position&id=eq.' + pid),
    api.rest('consents?select=player_id,version,accepted_at,withdrawn_at&player_id=eq.' + pid),
    api.rest('heights?select=id,measured_on,height_cm,created_at&player_id=eq.' + pid + '&order=measured_on.desc&limit=24'),
    api.rest('session_logs?select=*&player_id=eq.' + pid + '&order=created_at.desc&limit=100'),
    api.rest('goals?select=*&player_id=eq.' + pid + '&order=created_at.asc'),
    api.rest('personal_entries?select=*&player_id=eq.' + pid + '&order=starts.asc')
  ]);
  S.spiller = (spillere && spillere[0]) || null;
  S.samtykker = samtykker || [];
  S.hoyder = hoyder || [];
  S.logger = logger || [];
  S.mal = mal || [];
  S.kalender = kalender || [];
}

async function lastForelder() {
  const uid = encodeURIComponent(S.profil.id);
  const [lenker, samtykker] = await Promise.all([
    api.rest('parent_links?select=player_id,players(id,full_name)&parent_id=eq.' + uid),
    api.rest('consents?select=player_id,version,accepted_at,withdrawn_at&parent_id=eq.' + uid)
  ]);
  S.barn = (lenker || []).map((l) => l.players).filter(Boolean);
  S.samtykker = samtykker || [];
}

async function lastTrener() {
  const fra = new Date(Date.now() - 120 * DAG_MS).toISOString();
  const [spillere, profiler, lenker, samtykker, koder, soner, logger, mal, kalender, samtaleTider] = await Promise.all([
    api.rest('players?select=id,full_name,position,active&order=full_name.asc'),
    api.rest('profiles?select=id,username,full_name,role,player_id&order=full_name.asc'),
    api.rest('parent_links?select=parent_id,player_id'),
    api.rest('consents?select=player_id,parent_id,version,accepted_at,withdrawn_at'),
    api.rest('invites?select=code,purpose,role,full_name,player_id,user_id,created_at,expires_at,used_at&order=created_at.desc&limit=300'),
    api.rest('vekstsoner?select=*'),
    api.rest('session_logs?select=*&created_at=gte.' + encodeURIComponent(fra) + '&order=created_at.desc&limit=5000'),
    api.rest('goals?select=*&order=created_at.asc'),
    api.rest('personal_entries?select=*&order=starts.asc&limit=5000'),
    api.rest('samtale_tider?select=*&order=starts_at.asc').catch((feil) => {
      if (feil instanceof ApiFeil && feil.status === 401) throw feil;
      return [];
    })
  ]);
  S.trener = {
    spillere: spillere || [],
    profiler: profiler || [],
    lenker: lenker || [],
    samtykker: samtykker || [],
    koder: koder || [],
    soner: soner || [],
    logger: logger || [],
    mal: mal || [],
    kalender: kalender || [],
    samtaleTider: samtaleTider || []
  };
}

function harSamtykke(spillerId) {
  return S.samtykker.some((c) => c.player_id === spillerId && !c.withdrawn_at);
}

/* Ekte trener. I forhåndsvisningen er profilen byttet ut, så trenerknappene forsvinner der. */
function erTrener() {
  return Boolean(S.profil) && S.profil.role === 'trener';
}

/* ---------- Visninger: innlogging ---------- */

function skjemafeil() {
  return '<p class="skjemafeil" role="alert" hidden></p>';
}

function inngang(innhold) {
  return '<div class="inngang">'
    + '<div class="inngang-bilde"><img src="img/lag-samling.jpg" alt="TG1 samlet i ring">'
    + '<div class="striper" aria-hidden="true"></div>'
    + '<div class="logo-merke"><img src="img/kolbotn-logo.png" alt="Kolbotn IL"></div></div>'
    + '<div class="inngang-innhold">' + innhold + '</div></div>';
}

function visInnlogging() {
  return inngang(
    '<div class="overskrift"><h1>Kolbotn G2011</h1><p class="dempet">Lagets side for TG1</p></div>'
    + (UI.melding ? '<p class="varsel ok" role="status">' + esc(UI.melding) + '</p>' : '')
    + '<form class="skjema" data-skjema="logg-inn" novalidate>'
    + '<div class="felt"><label for="bn">Brukernavn</label><input id="bn" name="brukernavn" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>'
    + '<div class="felt"><label for="pw">Passord</label><input id="pw" name="passord" type="password" autocomplete="current-password" required></div>'
    + skjemafeil()
    + '<button class="knapp" type="submit">Logg inn</button></form>'
    + '<div class="lenker"><a class="lenkeknapp" href="#/forste-gang">Første gang? Bruk koden fra treneren</a>'
    + '<a class="lenkeknapp" href="#/nytt-passord">Glemt passord?</a></div>'
    + '<p class="dempet liten sentrert">Bare for spillere, foreldre og trenere i TG1</p>'
  );
}

function visForsteGang() {
  return inngang(
    '<div class="overskrift"><h1>Første gang</h1><p class="dempet">Bruk koden du har fått fra treneren, og lag ditt eget brukernavn og passord.</p></div>'
    + '<form class="skjema" data-skjema="forste-gang" novalidate>'
    + '<div class="felt"><label for="kode">Kode fra treneren</label><input id="kode" name="kode" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" required></div>'
    + '<div class="felt"><label for="nybn">Velg brukernavn</label><input id="nybn" name="brukernavn" autocomplete="username" autocapitalize="none" spellcheck="false" required>'
    + '<span class="hjelp">3–30 tegn: små bokstaver, tall, punktum eller bindestrek. For eksempel ola.n</span></div>'
    + '<div class="felt"><label for="nypw">Velg passord</label><input id="nypw" name="passord" type="password" autocomplete="new-password" required>'
    + '<span class="hjelp">Minst 8 tegn.</span></div>'
    + '<div class="felt"><label for="nypw2">Gjenta passord</label><input id="nypw2" name="passord2" type="password" autocomplete="new-password" required></div>'
    + skjemafeil()
    + '<button class="knapp" type="submit">Lag konto</button></form>'
    + '<div class="lenker"><a class="lenkeknapp" href="#/">Tilbake til innlogging</a></div>'
  );
}

function visNyttPassord() {
  return inngang(
    '<div class="overskrift"><h1>Nytt passord</h1><p class="dempet">Be treneren om en kode for nytt passord, og velg et nytt passord her.</p></div>'
    + '<form class="skjema" data-skjema="nytt-passord" novalidate>'
    + '<div class="felt"><label for="pkode">Kode fra treneren</label><input id="pkode" name="kode" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" required></div>'
    + '<div class="felt"><label for="ppw">Nytt passord</label><input id="ppw" name="passord" type="password" autocomplete="new-password" required>'
    + '<span class="hjelp">Minst 8 tegn.</span></div>'
    + '<div class="felt"><label for="ppw2">Gjenta passord</label><input id="ppw2" name="passord2" type="password" autocomplete="new-password" required></div>'
    + skjemafeil()
    + '<button class="knapp" type="submit">Lagre passord</button></form>'
    + '<div class="lenker"><a class="lenkeknapp" href="#/">Tilbake til innlogging</a></div>'
  );
}

function visUtenProfil() {
  return inngang(
    '<div class="overskrift"><h1>Fant ikke profilen</h1><p class="dempet">Kontoen din er ikke koblet til laget. Ta kontakt med treneren.</p></div>'
    + '<button class="knapp sekundar" type="button" data-handling="logg-ut">Logg ut</button>'
  );
}

function visLastFeil() {
  return inngang(
    '<div class="overskrift"><h1>Noe gikk galt</h1><p class="dempet">' + esc(S.lastFeil) + '</p></div>'
    + '<button class="knapp" type="button" data-handling="prov-igjen">Prøv igjen</button>'
    + '<button class="knapp sekundar" type="button" data-handling="logg-ut">Logg ut</button>'
  );
}

/* ---------- Visninger: rammen ---------- */

/* Undersider markerer fanen de hører til. */
const FANE_FOR = {
  plan: 'mer', spillmodell: 'mer', egentrening: 'mer', inspirasjon: 'hjem',
  logg: 'meg', mal: 'meg', okt: 'trener', spiller: 'trener', oppforing: 'kalender', hendelse: 'kalender'
};

function faneFor(aktiv) {
  if (aktiv === 'oppforing' && S.profil.role === 'trener') return ruteParam('fra') === 'kalender' ? 'kalender' : 'trener';
  if (aktiv === 'mal' && S.profil.role === 'trener') return 'trener';
  if (aktiv === 'samtale') return S.profil.role === 'trener' ? 'trener' : 'hjem';
  return FANE_FOR[aktiv] || aktiv;
}

function ramme(aktiv, innhold) {
  const faner = [
    ['hjem', 'Hjem', IKON.hus],
    ['uke', 'Denne uka', IKON.uke],
    ['kalender', 'Kalender', IKON.kalender],
    S.profil.role === 'trener' ? ['trener', 'Trener', IKON.tavle] : ['meg', 'Meg', IKON.person],
    ['mer', 'Mer', IKON.meny]
  ];
  const fane = faneFor(aktiv);
  const meny = faner.map(([rute, navn, ikon]) => '<a class="fane" href="#/' + rute + '"'
    + (rute === fane ? ' aria-current="page"' : '') + '>' + ikon + esc(navn) + '</a>').join('');
  const melding = UI.melding ? '<p class="varsel ok" role="status">' + esc(UI.melding) + '</p>' : '';
  return '<header class="topp"><a class="merke" href="#/hjem"><img src="img/kolbotn-logo.png" alt="" width="26" height="32"><span>Kolbotn G2011</span></a>'
    + '<a class="ikonknapp" href="#/meg" aria-label="Min side">' + IKON.person + '</a></header>'
    + '<div class="striper" aria-hidden="true"></div>'
    + visningsBanner()
    + '<main class="innhold" id="innhold">' + melding + innhold + '</main>'
    + '<nav class="fanebar' + (faner.length === 5 ? ' fem' : '') + '" aria-label="Hovedmeny">' + meny + '</nav>';
}

function merkelapp(h) {
  if (h.status === 'planlagt') return '<span class="merkelapp planlagt">Planlagt</span>';
  if (h.status === 'avlyst') return '<span class="merkelapp avlyst">Avlyst</span>';
  return '';
}

function faktaRad(ikon, etikett, innhold) {
  return '<div class="fakta-rad">' + ikon + '<div><span class="etikett">' + esc(etikett) + '</span>' + innhold + '</div></div>';
}

function hendelseFakta(h) {
  const rader = [];
  if (h.meet_at) rader.push(faktaRad(IKON.klokke, 'Oppmøte', '<span>' + esc(klokke(h.meet_at)) + '</span>'));
  if (h.location) rader.push(faktaRad(IKON.sted, 'Sted', '<span>' + esc(h.location) + '</span>'));
  if (h.opponent) rader.push(faktaRad(IKON.motstander, 'Motstander', '<span>' + esc(h.opponent) + '</span>'));
  if (h.theme) rader.push(faktaRad(IKON.tema, 'Tema', '<span>' + esc(h.theme) + '</span>'));
  if (h.why) rader.push(faktaRad(IKON.hvorfor, 'Hvorfor', '<span>' + esc(h.why) + '</span>'));
  if (h.details) rader.push(faktaRad(IKON.info, 'Opplegg', '<div class="tekst-md">' + md(h.details) + '</div>'));
  return rader;
}

/* ---------- Denne uka ---------- */

function visUke() {
  const naa = new Date();
  const kommende = S.hendelser.filter((h) => sluttTid(h) >= naa);
  const neste = kommende.find((h) => h.status !== 'avlyst');
  const ref = neste ? new Date(neste.starts_at) : naa;
  const mandag = mandagFor(ref);
  const sammeUke = mandag.getTime() === mandagFor(naa).getTime();
  const ukas = S.hendelser.filter((h) => {
    const m = mandagFor(new Date(h.starts_at));
    return m.getTime() === mandag.getTime();
  });
  const resten = ukas.filter((h) => h !== neste && sluttTid(h) >= naa);
  const periode = periodeFor(S.perioder, osloDatoStr(ref));
  const kamp = kommende.find((h) => (h.kind === 'kamp' || h.kind === 'cup') && h.status !== 'avlyst');
  let html = '<div class="overskrift"><p class="overlinje">' + (sammeUke ? 'Denne uka' : 'Neste uke med aktivitet') + '</p>'
    + '<h1>Uke ' + isoUke(mandag) + ' · ' + esc(ukeTekst(mandag)) + '</h1></div>';

  if (periode) {
    const pn = periodeNavn(periode);
    html += '<section class="periodekort"><img src="img/lag-feiring.jpg" alt="Laget feirer med pokal">'
      + '<div class="tekst"><p class="overlinje">' + esc(pn.kort) + ' · ' + esc(periodeKortTekst(periode)) + '</p>'
      + '<h2>' + esc(pn.navn) + '</h2>'
      + (periode.focus ? '<p>' + esc(periode.focus) + '</p>' : '')
      + (periode.why ? '<p>' + esc(periode.why) + '</p>' : '')
      + '</div></section>';
  }

  html += samtaleKort();
  if (S.profil.role === 'spiller' && harSamtykke(S.profil.player_id)) html += loggPaaminnelse() + hoydePaaminnelse();

  if (neste) {
    const d = dagInfo(neste.starts_at);
    const fakta = hendelseFakta(neste);
    html += '<section class="kort"><div class="kort-topp"><p class="overlinje">Neste</p>' + merkelapp(neste) + '</div>'
      + '<p><strong>' + esc(d.lang) + '</strong></p>'
      + '<p class="tid-stor">' + esc(tidTekst(neste)) + '</p>'
      + '<p>' + esc(neste.title) + '</p>'
      + (fakta.length ? '<div class="fakta">' + fakta.join('') + '</div>' : '')
      + (erTrener() ? endreLenke(neste) : '')
      + '</section>';
  } else {
    html += '<section class="kort tomt"><p><strong>Ingen aktiviteter lagt inn</strong></p><p class="dempet liten">Treninger og kamper kommer her når tidene er klare.</p></section>';
  }

  if (resten.length) {
    html += '<section class="uke"><h2>' + (sammeUke ? 'Resten av uka' : 'Resten av den uka') + '</h2>'
      + '<div class="liste">' + resten.map(hendelseRad).join('') + '</div></section>';
  }

  html += '<section class="kort"><p class="overlinje">Neste kamp</p>'
    + (kamp
      ? '<p><strong>' + esc(kamp.title) + '</strong></p><p class="dempet">' + esc(dagInfo(kamp.starts_at).lang + ' · ' + tidTekst(kamp))
        + (kamp.location ? ' · ' + esc(kamp.location) : '') + '</p>'
      : '<p class="dempet">Ingen kamper lagt inn ennå</p>')
    + '</section>';

  return html;
}

function hendelseRad(h) {
  const d = dagInfo(h.starts_at);
  const avlyst = h.status === 'avlyst';
  const topp = '<div class="dato-blokk"><span class="dag">' + esc(d.kort) + '</span><span class="dato">' + esc(d.dato) + '</span></div>'
    + '<div class="rad-tekst"><span class="navn' + (avlyst ? ' avlyst-tekst' : '') + '">' + esc(h.title) + '</span>'
    + '<span class="under">' + esc(tidTekst(h)) + (h.location ? ' · ' + esc(h.location) : '') + '</span></div>'
    + merkelapp(h);
  const fakta = hendelseFakta(h);
  if (erTrener()) fakta.push(endreLenke(h));
  if (!fakta.length) return '<div class="rad">' + topp + '</div>';
  return '<details><summary class="rad">' + topp + '</summary><div class="detaljer">' + fakta.join('') + '</div></details>';
}

function endreLenke(h) {
  return '<a class="lenkeknapp endre" href="#/hendelse?id=' + esc(encodeURIComponent(h.id)) + '">Endre, avlys eller slett</a>';
}

function loggFor(eventId) {
  return S.logger.find((l) => l.event_id === eventId) || null;
}

/* Økter spilleren kan logge nå, nyeste først. */
function loggbareOkter() {
  return S.hendelser.filter(kanLogges).sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
}

function loggPaaminnelse() {
  const ulogget = loggbareOkter().filter((h) => !loggFor(h.id));
  if (!ulogget.length) return '';
  const h = ulogget[0];
  const flere = ulogget.length - 1;
  return '<section class="kort uthevet"><p class="overlinje">Logg økta</p>'
    + '<p><strong>Hvordan var økta ' + esc(dagInfo(h.starts_at).lang.toLowerCase()) + '?</strong></p>'
    + '<p class="dempet liten">Belastning fra 1 til 10, tre ting som var bra og én ting å bli bedre på. Det tar ett minutt.</p>'
    + '<a class="knapp liten-knapp" href="#/logg?okt=' + esc(encodeURIComponent(h.id)) + '">Logg økta</a>'
    + (flere ? '<p class="dempet liten">Du har ' + flere + (flere === 1 ? ' økt' : ' økter') + ' til som ikke er logget. Se «Meg».</p>' : '')
    + '</section>';
}

function hoydePaaminnelse() {
  const siste = S.hoyder[0];
  if (siste && dagerSiden(siste.measured_on) < 30) return '';
  return '<section class="kort"><p class="overlinje">Høyde</p>'
    + '<p><strong>Tid for å måle høyden</strong></p>'
    + '<p class="dempet liten">' + (siste ? 'Siste måling var ' + esc(datoUtenAar(siste.measured_on)) + '.' : 'Du har ikke lagt inn høyden ennå.') + '</p>'
    + '<a class="knapp liten-knapp" href="#/meg">Legg inn høyde</a></section>';
}

/* ---------- Kalender ---------- */

function visKalender() {
  if (S.profil.role === 'spiller' && ruteParam('vis') === 'min') {
    return '<div class="overskrift"><h1>Kalender</h1><p class="dempet">Din uke: lagets økter og det du har lagt inn selv</p></div>'
      + kalenderValg() + visMinKalender();
  }
  let html = '<div class="overskrift"><h1>Kalender</h1><p class="dempet">Treninger, kamper og periodene i årshjulet</p></div>'
    + kalenderValg() + kalenderVerktoy(false);
  if (!S.perioder.length) return html + '<section class="kort tomt"><p>Ingen perioder lagt inn ennå.</p></section>';
  const standard = periodeFor(S.perioder, idagStr()) || S.perioder[S.perioder.length - 1];
  const valgt = S.perioder.find((p) => p.id === UI.periode) || standard;
  UI.periode = valgt.id;

  html += '<section class="uke" aria-label="Årshjulet"><p class="overlinje">Årshjulet</p><div class="chips">'
    + S.perioder.map((p) => '<button type="button" class="chip periode" data-handling="periode" data-id="' + esc(p.id) + '" aria-pressed="' + (p.id === valgt.id) + '">'
      + '<b>' + esc(periodeNavn(p).kort) + '</b><span>' + esc(periodeMnd(p)) + '</span></button>').join('')
    + '</div></section>';

  const pn = periodeNavn(valgt);
  html += '<section class="kort"><h2>' + esc(pn.kort + ' · ' + pn.navn) + '</h2>'
    + '<p class="dempet liten">' + esc(periodeTekst(valgt)) + '</p>'
    + (valgt.focus ? '<p>' + esc(valgt.focus) + '</p>' : '')
    + (valgt.why ? '<p>' + esc(valgt.why) + '</p>' : '')
    + '<a class="lenkeknapp" href="#/plan">Les utviklingsplanen</a></section>';

  const hendelser = S.hendelser.filter((h) => {
    const dag = osloDatoStr(new Date(h.starts_at));
    return h.period_id === valgt.id || (dag >= valgt.start_date && dag <= valgt.end_date);
  });
  if (!hendelser.length) {
    return html + '<section class="kort tomt"><p><strong>Ingen aktiviteter lagt inn ennå</strong></p><p class="dempet liten">'
      + (erTrener() ? 'Trykk «Ny økt for laget» øverst for å legge inn.' : 'Treninger og kamper kommer her når tidene er klare.') + '</p></section>';
  }
  const uker = new Map();
  for (const h of hendelser) {
    const m = mandagFor(new Date(h.starts_at));
    const nokkel = m.toISOString().slice(0, 10);
    if (!uker.has(nokkel)) uker.set(nokkel, { mandag: m, liste: [] });
    uker.get(nokkel).liste.push(h);
  }
  for (const uke of uker.values()) {
    html += '<section class="uke"><div class="ukehode"><h3>Uke ' + isoUke(uke.mandag) + '</h3><span>' + esc(ukeTekst(uke.mandag)) + '</span></div>'
      + '<div class="liste">' + uke.liste.map(hendelseRad).join('') + '</div></section>';
  }
  return html;
}

/* ---------- Spillmodell ---------- */

function bane() {
  const spillere = [['k', 'K'], ['vb', 'VB'], ['vs', 'VS'], ['hs', 'HS'], ['hb', 'HB'], ['m6', '6'], ['m8v', '8'], ['m8h', '8'], ['vk', 'VK'], ['st', 'S'], ['hk', 'HK']];
  return '<div class="bane" role="img" aria-label="Grunnformasjon 4–3–3 med keeper, fire forsvarere, tre midtbanespillere og tre angripere">'
    + '<span class="linje ytre"></span><span class="linje midt"></span><span class="linje sirkel"></span>'
    + '<span class="linje boks-v"></span><span class="linje boks-h"></span><span class="linje mal-v"></span><span class="linje mal-h"></span>'
    + spillere.map(([klasse, tekst]) => '<span class="sp ' + klasse + '" aria-hidden="true">' + tekst + '</span>').join('')
    + '</div>';
}

function visSpillmodell() {
  const side = S.sider.spillmodell;
  let html = '<div class="overskrift"><h1>Spillmodell</h1><p class="dempet">Slik spiller Kolbotn G2011</p></div>'
    + '<img class="bannerbilde" src="img/lag-hall.jpg" alt="Laget samlet i hallen">';
  if (!side) return html + '<section class="kort tomt"><p>Spillmodellen er ikke lagt inn ennå.</p></section>';
  const deler = seksjoner(side.body);
  const finn = (navn) => deler.find((d) => d.tittel.toLowerCase() === navn);
  const grunn = finn('grunnformasjon');
  const sprak = finn('felles språk');
  const standarder = finn('tekniske standarder');
  const faser = deler.filter((d) => d.tittel && !SPESIELLE_SEKSJONER.includes(d.tittel.toLowerCase()));
  const valgt = faser.find((f) => f.tittel === UI.fase) || faser[0];

  html += '<section class="kort"><h2>Grunnformasjon 4–3–3</h2>' + bane()
    + (grunn ? '<div class="tekst-md">' + md(grunn.tekst) + '</div>' : '') + '</section>';

  if (valgt) {
    html += '<section class="uke"><h2>Prinsipper</h2><div class="chips bryt">'
      + faser.map((f) => '<button type="button" class="chip" data-handling="fase" data-navn="' + esc(f.tittel) + '" aria-pressed="' + (f === valgt) + '">' + esc(f.tittel) + '</button>').join('')
      + '</div><div class="kort"><h3>' + esc(valgt.tittel) + '</h3><div class="tekst-md">' + md(valgt.tekst) + '</div></div></section>';
  }

  if (sprak) {
    const ord = sprak.tekst.split(/[·\n,]/).map((o) => o.trim()).filter(Boolean);
    html += '<section class="uke"><div class="overskrift"><h2>Felles språk</h2><p class="dempet liten">Ordene trenerne bruker på feltet</p></div>'
      + '<div class="ord">' + ord.map((o) => '<span>' + esc(o) + '</span>').join('') + '</div></section>';
  }

  if (standarder) {
    const punkter = listepunkter(standarder.tekst);
    html += '<section class="uke"><h2>Tekniske standarder</h2><div class="kort">'
      + (punkter.length
        ? '<ul class="sjekkliste">' + punkter.map((p) => '<li>' + IKON.sjekk + '<span>' + mdInline(esc(p)) + '</span></li>').join('') + '</ul>'
        : '<div class="tekst-md">' + md(standarder.tekst) + '</div>')
      + '</div></section>';
  }

  html += '<a class="knapp sekundar" href="#/plan">Utviklingsplan 2027</a>';
  return html;
}

/* ---------- Utviklingsplan ---------- */

function visPlan() {
  const side = S.sider.utviklingsplan;
  let html = '<div class="overskrift"><p class="overlinje">Felles for laget</p><h1>' + esc(side ? side.title : 'Utviklingsplan') + '</h1></div>';
  if (side && side.body) html += '<section class="kort"><div class="tekst-md">' + md(side.body) + '</div></section>';
  if (S.perioder.length) {
    html += '<section class="uke"><h2>Årshjulet</h2><div class="liste">'
      + S.perioder.map((p) => {
        const pn = periodeNavn(p);
        return '<div class="rad"><div class="dato-blokk"><span class="dag">' + esc(periodeMnd(p)) + '</span><span class="dato">' + esc(pn.kort) + '</span></div>'
          + '<div class="rad-tekst"><span class="navn">' + esc(pn.navn) + '</span>'
          + (p.focus ? '<span class="under">' + esc(p.focus) + '</span>' : '') + '</div></div>';
      }).join('')
      + '</div></section>';
  }
  return html;
}

/* ---------- Meg ---------- */

function visMeg() {
  const p = S.profil;
  let html = '<div class="overskrift"><p class="overlinje">' + esc(ROLLE_NAVN[p.role] || p.role) + '</p><h1>' + esc(p.full_name) + '</h1>'
    + '<p class="dempet">Brukernavn: ' + esc(p.username) + '</p></div>';
  if (p.role === 'spiller') html += megSpiller();
  if (p.role === 'forelder') html += megForelder();
  html += '<section class="kort"><h2>Bytt passord</h2>'
    + '<form class="skjema" data-skjema="bytt-passord" novalidate>'
    + '<div class="felt"><label for="bpw">Nytt passord</label><input id="bpw" name="passord" type="password" autocomplete="new-password" required><span class="hjelp">Minst 8 tegn.</span></div>'
    + '<div class="felt"><label for="bpw2">Gjenta passord</label><input id="bpw2" name="passord2" type="password" autocomplete="new-password" required></div>'
    + skjemafeil()
    + '<button class="knapp sekundar" type="submit">Lagre passord</button></form></section>'
    + '<button class="knapp sekundar" type="button" data-handling="logg-ut">Logg ut</button>';
  return html;
}

function megSpiller() {
  if (!harSamtykke(S.profil.player_id)) {
    return megMal() + '<section class="kort tomt"><h2>Logg og høyde</h2><p>Foresatte må gi samtykke før du kan logge økter og legge inn høyden.</p>'
      + '<p class="dempet liten">Be dem logge inn med koden de har fått fra treneren, og godkjenne under «Meg».</p></section>';
  }
  return megMal() + megOkter() + megHoyde();
}

/* Én blokk per mål. Spilleren og treneren ser det samme, treneren kan i tillegg kommentere. */
function malBlokk(m, lenke, kommentarSkjema) {
  const st = MAL_STATUS[m.status] || MAL_STATUS.aktiv;
  return '<div class="mal">'
    + '<div class="mal-topp"><p class="mal-tekst">' + esc(m.goal) + '</p>'
    + '<span class="merkelapp ' + st.klasse + '">' + esc(st.navn) + '</span></div>'
    + (m.how ? '<p class="liten"><span class="dempet">Slik:</span> ' + esc(m.how) + '</p>' : '')
    + (m.reflection ? '<p class="liten"><span class="dempet">Hvordan det gikk:</span> ' + esc(m.reflection) + '</p>' : '')
    + (m.coach_comment && !kommentarSkjema ? '<p class="trenerkommentar"><strong>Trener:</strong> ' + esc(m.coach_comment) + '</p>' : '')
    + (kommentarSkjema
      ? '<form class="skjema kommentar" data-skjema="trenerkommentar" novalidate><input type="hidden" name="id" value="' + esc(m.id) + '">'
        + '<div class="felt"><label for="k-' + esc(m.id) + '">Kommentar fra trener</label>'
        + '<textarea id="k-' + esc(m.id) + '" name="kommentar" maxlength="400" rows="2">' + esc(m.coach_comment || '') + '</textarea></div>'
        + skjemafeil() + '<button class="knapp sekundar liten-knapp" type="submit">Lagre kommentar</button></form>'
      : '')
    + (lenke ? '<a class="lenkeknapp" href="' + esc(lenke) + '">Endre</a>' : '')
    + '</div>';
}

function megMal() {
  const apne = apnePerioder();
  let html = '<section class="uke"><h2>Mine mål</h2>';
  if (!apne.length) {
    html += '<section class="kort tomt"><p class="dempet">Ingen periode å sette mål for akkurat nå.</p></section>';
  }
  apne.forEach((p, i) => {
    const mal = S.mal.filter((m) => m.period_id === p.id);
    const snart = (datoFraStr(p.start_date) - datoFraStr(idagStr())) / DAG_MS <= 10;
    if (i > 0 && !mal.length && !snart) return;
    const pn = periodeNavn(p);
    html += '<div class="kort"><p class="overlinje">' + esc(pn.kort) + ' · ' + esc(periodeKortTekst(p)) + '</p>'
      + '<h3>' + esc(pn.navn) + '</h3>'
      + (p.focus ? '<p class="dempet liten">Periodens fokus: ' + esc(p.focus) + '</p>' : '')
      + (mal.length
        ? mal.map((m) => malBlokk(m, '#/mal?id=' + encodeURIComponent(m.id), false)).join('')
        : '<p>Ingen mål ennå. Velg én til tre ting du vil bli bedre på i perioden.</p>')
      + (mal.length < 3 ? '<a class="knapp liten-knapp" href="#/mal?periode=' + esc(encodeURIComponent(p.id)) + '">Nytt mål</a>' : '')
      + '</div>';
  });
  const tidligere = S.mal.filter((m) => !apne.some((p) => p.id === m.period_id));
  if (tidligere.length) {
    const perioder = [...new Set(tidligere.map((m) => m.period_id))];
    html += '<details class="kort"' + (perioder.some(kanEvaluere) ? ' open' : '') + '><summary class="lenkeknapp">Tidligere mål (' + tidligere.length + ')</summary>'
      + perioder.map((id) => '<p class="overlinje">' + esc(periodeTittel(id)) + '</p>'
        + (kanEvaluere(id) ? '<p class="dempet liten">Perioden er over. Gi hvert mål en status og skriv kort hvordan det gikk.</p>' : '')
        + tidligere.filter((m) => m.period_id === id)
          .map((m) => malBlokk(m, kanEvaluere(id) ? '#/mal?id=' + encodeURIComponent(m.id) : null, false)).join('')).join('')
      + '</details>';
  }
  return html + '</section>';
}

/* Spillere kan gi status og skrive hvordan det gikk i to uker etter at perioden er over. */
function kanEvaluere(periodeId) {
  const p = S.perioder.find((x) => x.id === periodeId);
  return Boolean(p) && dagerSiden(p.end_date) <= 14;
}

function megOkter() {
  const naa = Date.now();
  const okter = S.hendelser
    .filter((h) => LOGG_TYPER.includes(h.kind) && h.status !== 'avlyst' && new Date(h.starts_at).getTime() <= naa
      && sluttTid(h).getTime() >= naa - 28 * DAG_MS)
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
    .slice(0, 10);
  let html = '<section class="uke"><h2>Mine økter</h2>';
  if (!okter.length) {
    const neste = S.hendelser.find((h) => LOGG_TYPER.includes(h.kind) && h.status !== 'avlyst' && new Date(h.starts_at).getTime() > naa);
    return html + '<section class="kort tomt"><p>Etter hver økt logger du belastning og tre ting som var bra her.</p>'
      + (neste ? '<p class="dempet liten">Neste økt: ' + esc(dagInfo(neste.starts_at).lang.toLowerCase()) + '.</p>' : '')
      + '</section></section>';
  }
  html += '<div class="liste">' + okter.map((h) => {
    const d = dagInfo(h.starts_at);
    const l = loggFor(h.id);
    const under = l
      ? 'Belastning ' + l.rpe + ' · ' + l.minutes + ' min' + (l.pain !== 'nei' ? ' · ' + SMERTE_NAVN[l.pain].toLowerCase() + ' smerter' : '')
      : (kanLogges(h) ? 'Ikke logget' : 'Ikke logget, fristen er ute');
    const handling = kanLogges(h)
      ? '<a class="lenkeknapp" href="#/logg?okt=' + esc(encodeURIComponent(h.id)) + '">' + (l ? 'Endre' : 'Logg') + '</a>'
      : '';
    return '<div class="rad"><div class="dato-blokk"><span class="dag">' + esc(d.kort) + '</span><span class="dato">' + esc(d.dato) + '</span></div>'
      + '<div class="rad-tekst"><span class="navn">' + esc(h.title) + '</span><span class="under">' + esc(under) + '</span></div>'
      + handling + '</div>';
  }).join('') + '</div>';
  return html + '</section>';
}

function megHoyde() {
  const siste = S.hoyder[0];
  const forrige = S.hoyder[1];
  let html = '<section class="kort"><div class="kort-topp"><h2>Høyde</h2>'
    + (siste && dagerSiden(siste.measured_on) < 30 ? '' : '<span class="merkelapp planlagt">Tid for måling</span>') + '</div>';
  if (siste) {
    html += '<p class="hoyde-tall">' + esc(cm(siste.height_cm)) + ' cm</p>'
      + '<p class="dempet liten">Målt ' + esc(datoTekst(siste.measured_on))
      + (forrige ? ' · ' + esc(medFortegn(siste.height_cm - forrige.height_cm)) + ' cm siden ' + esc(datoUtenAar(forrige.measured_on)) : '') + '</p>';
  }
  html += '<p class="dempet liten">Mål stående høyde hjemme én gang i måneden, uten sko, med samme utstyr og omtrent samme tid på dagen.</p>'
    + '<form class="skjema" data-skjema="hoyde" novalidate><div class="to-kol">'
    + '<div class="felt"><label for="hcm">Høyde i cm</label><input id="hcm" name="cm" inputmode="decimal" placeholder="f.eks. 176,5" autocomplete="off" required></div>'
    + '<div class="felt"><label for="hdato">Dato</label><input id="hdato" name="dato" type="date" value="' + esc(idagStr()) + '" max="' + esc(idagStr()) + '" required></div>'
    + '</div>' + skjemafeil()
    + '<button class="knapp" type="submit">Lagre høyde</button></form></section>';
  if (S.hoyder.length) {
    html += '<section class="uke"><h3>Tidligere målinger</h3><div class="liste">'
      + S.hoyder.slice(0, 8).map((h, i) => {
        const neste = S.hoyder[i + 1];
        const kanSlette = Date.now() - new Date(h.created_at).getTime() < 7 * DAG_MS;
        return '<div class="rad"><div class="rad-tekst"><span class="navn">' + esc(cm(h.height_cm)) + ' cm</span>'
          + '<span class="under">' + esc(datoTekst(h.measured_on)) + (neste ? ' · ' + esc(medFortegn(h.height_cm - neste.height_cm)) + ' cm' : '') + '</span></div>'
          + (kanSlette ? '<button type="button" class="lenkeknapp" data-handling="slett-hoyde" data-id="' + esc(h.id) + '">Slett</button>' : '')
          + '</div>';
      }).join('')
      + '</div></section>';
  }
  return html;
}

function megForelder() {
  if (!S.barn.length) {
    return '<section class="kort tomt"><p>Kontoen din er ikke koblet til en spiller ennå. Ta kontakt med treneren.</p></section>';
  }
  const tekst = S.sider.samtykke ? md(S.sider.samtykke.body) : '<p>Samtykketeksten er ikke lagt inn ennå.</p>';
  return S.barn.map((b) => {
    const aktive = S.samtykker.filter((c) => c.player_id === b.id && !c.withdrawn_at);
    const gitt = aktive[0];
    const status = gitt
      ? '<span class="merkelapp sone-gronn">Samtykke gitt ' + esc(datoUtenAar(osloDatoStr(new Date(gitt.accepted_at)))) + '</span>'
      : '<span class="merkelapp planlagt">Ikke gitt</span>';
    const knapp = gitt
      ? '<button type="button" class="knapp sekundar" data-handling="samtykke-trekk" data-spiller="' + esc(b.id) + '">Trekk samtykket</button>'
      : '<button type="button" class="knapp" data-handling="samtykke-gi" data-spiller="' + esc(b.id) + '">Jeg samtykker</button>';
    return '<section class="kort"><div class="kort-topp"><h2>Samtykke for ' + esc(b.full_name.split(' ')[0]) + '</h2>' + status + '</div>'
      + '<p class="dempet liten">' + esc(b.full_name) + '</p>'
      + '<details><summary class="lenkeknapp">Les hva samtykket gjelder</summary><div class="tekst-md">' + tekst + '</div></details>'
      + knapp + '</section>';
  }).join('');
}

/* ---------- Hjem og Mer ---------- */

/* Forklaring på appen, tilpasset rollen. Ligger øverst på Hjem. */
function appForklaring() {
  const hjemskjerm = ['Tips', 'Legg siden til på Hjem-skjermen, så funker den som en app. På iPhone: Del-knappen i Safari, deretter «Legg til på Hjem-skjerm».'];
  const punkter = {
    spiller: [
      ['Hjem', 'Her deler trenerne videoer, innlegg og artikler. Scroll gjennom og trykk på en video for å se den.'],
      ['Denne uka', 'Neste trening med oppmøte og sted. Etter økta logger du hvor hard den var, tre ting som var bra og én ting å bli bedre på.'],
      ['Kalender', 'Lagets kalender, og Min kalender der du legger inn skole, annen trening, måltider og når du legger deg.'],
      ['Meg', 'Målene dine for perioden, øktene du har logget og høyden din.'],
      ['Mer', 'Egentrening, spillmodellen og utviklingsplanen.'],
      hjemskjerm
    ],
    forelder: [
      ['Hjem', 'Videoer, innlegg og artikler trenerne deler med laget.'],
      ['Denne uka og Kalender', 'Treninger, kamper og periodene i årshjulet.'],
      ['Meg', 'Her gir eller trekker du samtykke for gutten din.'],
      ['Mer', 'Egentrening, spillmodellen og utviklingsplanen.'],
      hjemskjerm
    ],
    trener: [
      ['Hjem', 'Det du deler under «Del noe nytt», havner øverst her. Lim inn lenker fra TikTok, Instagram, YouTube, Vimeo eller en artikkel.'],
      ['Denne uka og Kalender', 'Det samme som spillerne ser.'],
      ['Trener', 'Koder, logg fra øktene, annen belastning i dag, spillerne med mål og ukeplan, og vekstsoner.'],
      ['Mer', 'Egentrening, spillmodell, utviklingsplan og Meg.'],
      ['Forhåndsvisning', 'På Trener-fanen kan du se siden slik spillerne og foreldrene ser den.']
    ]
  }[S.profil.role] || [];
  return '<details class="kort forklaring"><summary><span class="forklaring-banner"><img src="img/lag-samling.jpg" alt="">'
    + '<span class="forklaring-tittel"><b>Slik bruker du appen</b><small>Trykk for en rask forklaring</small></span>'
    + '<span class="forklaring-pil" aria-hidden="true"></span></span></summary>'
    + '<ul class="forklaring-liste">' + punkter.map(([navn, tekst]) => '<li><strong>' + esc(navn) + '</strong><span>' + esc(tekst) + '</span></li>').join('') + '</ul></details>';
}

function delSkjema() {
  return '<details class="kort del"' + (S.inspirasjon.length ? '' : ' open') + '><summary class="lenkeknapp">Del noe nytt</summary>'
    + '<form class="skjema" data-skjema="inspirasjon" novalidate>'
    + '<div class="felt"><label for="iurl">Lenke</label><input id="iurl" name="url" type="url" inputmode="url" autocomplete="off" placeholder="https://"></div>'
    + '<div class="felt"><label for="ititt">Tittel</label><input id="ititt" name="tittel" maxlength="140" autocomplete="off" placeholder="F.eks. Scanning før mottak"></div>'
    + '<div class="felt"><label for="inotat">Hvorfor er dette verdt å se?</label><textarea id="inotat" name="notat" maxlength="500" rows="3" placeholder="F.eks. Se hvor ofte han ser seg rundt før ballen kommer."></textarea></div>'
    + skjemafeil() + '<button class="knapp" type="submit">Del med laget</button></form></details>';
}

/* Hjem er en feed med det trenerne deler, med forklaring på appen øverst. */
function visHjem() {
  const fornavn = String(S.profil.full_name || '').trim().split(/\s+/)[0] || '';
  let html = '<div class="overskrift"><p class="overlinje">Kolbotn G2011 · TG1</p><h1>' + (fornavn ? 'Hei, ' + esc(fornavn) + '!' : 'Hjem') + '</h1></div>'
    + samtaleKort()
    + appForklaring();
  if (S.profil.role === 'trener') html += delSkjema();
  if (!S.inspirasjon.length) {
    return html + '<section class="kort tomt"><p class="dempet">Her kommer videoer, innlegg og artikler trenerne deler med laget.</p></section>';
  }
  return html + '<div class="feed">' + S.inspirasjon.map(feedKort).join('') + '</div>';
}

function visMer() {
  const bokser = [
    ['egentrening', 'Egentrening', 'Programmer du kan gjøre selv: ball, sprint og styrke.', IKON.vekt],
    ['spillmodell', 'Spillmodell', 'Hvordan vi spiller med og uten ball.', IKON.bane],
    ['plan', 'Utviklingsplan 2027', 'Planen for neste sesong.', IKON.tavle]
  ];
  if (S.profil.role === 'trener') bokser.push(['meg', 'Meg', 'Brukernavn, passord og logg ut.', IKON.person]);
  return '<div class="overskrift"><h1>Mer</h1></div><div class="bokser">'
    + bokser.map(([rute, navn, tekst, ikon]) => '<a class="boks" href="#/' + rute + '"><span class="boks-ikon">' + ikon + '</span>'
      + '<span class="boks-navn">' + esc(navn) + '</span><span class="boks-tekst">' + esc(tekst) + '</span></a>').join('')
    + '</div>';
}

/* ---------- Spillersamtaler ---------- */

/*
 * Treneren har en runde med faste tider (samtaler og samtale_tider). Spillerne booker selv,
 * først til mølla, eller svarer at de heller vil ha annen dag eller telefon (samtale_svar).
 * Spillere og foreldre får bare vite om en tid er ledig og hvilken som er deres
 * (samtale_tider_status i databasen). Bare treneren ser hvem som har hvilken tid.
 * Spillerne kan ikke booke før treneren har åpnet påmeldingen.
 */
const SAMTALE_VALG = { annen_dag: 'Annen dag', telefon: 'Telefon eller video', annet: 'Annet' };

function tiderFor(runde, kilde) {
  return (kilde || S.samtaleTider).filter((t) => t.samtale_id === runde.id)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
}

/* Runder med minst én tid som ikke er passert, den første først. */
function aktiveSamtaler() {
  const naa = Date.now();
  return S.samtaler
    .filter((r) => tiderFor(r).some((t) => new Date(t.ends_at).getTime() > naa))
    .sort((a, b) => new Date(tiderFor(a)[0].starts_at) - new Date(tiderFor(b)[0].starts_at));
}

function samtaleDag(runde) {
  const tider = tiderFor(runde);
  return tider.length ? dagInfo(tider[0].starts_at).lang : '';
}

function samtaleSted(runde) {
  return runde.location ? ' · ' + runde.location : '';
}

/* Spillerens egen tid og svar i en runde. For en forelder: barnets. */
function mittSamtaleSvar(runde) {
  return {
    tid: tiderFor(runde).find((t) => t.min) || null,
    svar: S.samtaleSvar.find((s) => s.samtale_id === runde.id) || null
  };
}

/* Setter inn pauser der det er et hull mellom to tider. */
function tiderMedPauser(tider) {
  const ut = [];
  tider.forEach((t, i) => {
    const forrige = tider[i - 1];
    if (forrige && new Date(t.starts_at) > new Date(forrige.ends_at)) {
      ut.push({ pause: true, starts_at: forrige.ends_at, ends_at: t.starts_at });
    }
    ut.push(t);
  });
  return ut;
}

/* Kort på Hjem og Denne uka: book tid, eller tiden du har. */
function samtaleKort() {
  const rolle = S.profil.role;
  if (rolle !== 'spiller' && rolle !== 'forelder') return '';
  return aktiveSamtaler().map((r) => {
    const { tid, svar } = mittSamtaleSvar(r);
    if (tid) {
      return '<section class="kort uthevet"><p class="overlinje">' + esc(r.title) + '</p>'
        + '<p><strong>' + (rolle === 'spiller' ? 'Din tid: ' : 'Tiden til gutten din: ')
        + esc(dagInfo(tid.starts_at).lang.toLowerCase() + ' kl. ' + tidTekst(tid)) + '</strong></p>'
        + (r.location ? '<p class="dempet liten">' + esc(r.location) + '</p>' : '')
        + '<a class="lenkeknapp" href="#/samtale">' + (rolle === 'spiller' && r.apen ? 'Se eller bytt tid' : 'Se samtalen') + '</a></section>';
    }
    if (svar) {
      return '<section class="kort"><p class="overlinje">' + esc(r.title) + '</p>'
        + '<p><strong>' + (rolle === 'spiller' ? 'Du har svart: ' : 'Svar: ') + esc(SAMTALE_VALG[svar.valg] || svar.valg) + '</strong></p>'
        + '<p class="dempet liten">Treneren tar kontakt for å avtale.</p>'
        + '<a class="lenkeknapp" href="#/samtale">Se samtalen</a></section>';
    }
    if (!r.apen || rolle !== 'spiller') return '';
    const tider = tiderFor(r);
    const ledige = tider.filter((t) => t.ledig).length;
    return '<section class="kort uthevet"><p class="overlinje">' + esc(r.title) + '</p>'
      + '<p><strong>Book tid til samtalen</strong></p>'
      + '<p class="dempet liten">' + esc(samtaleDag(r) + samtaleSted(r)) + '. '
      + (ledige ? ledige + ' av ' + tider.length + ' tider er ledige. Først til mølla.' : 'Alle tidene er tatt. Si fra hva som passer.') + '</p>'
      + '<a class="knapp liten-knapp" href="#/samtale">' + (ledige ? 'Book tid' : 'Svar her') + '</a></section>';
  }).join('');
}

function visSamtale() {
  if (S.profil.role === 'trener') return visSamtaleTrener();
  const forelder = S.profil.role === 'forelder';
  const html = '<div class="overskrift"><p class="overlinje">Spillersamtale</p><h1>' + (forelder ? 'Samtale med treneren' : 'Book tid') + '</h1></div>';
  if (S.samtaleFeil) return html + '<section class="kort tomt"><p>Fikk ikke hentet tidene. Last siden på nytt.</p></section>';
  const runder = aktiveSamtaler();
  if (!runder.length) return html + '<section class="kort tomt"><p>Det er ingen samtaler å booke akkurat nå.</p></section>';
  return html + runder.map(forelder ? samtaleForelder : samtaleSpiller).join('');
}

function samtaleInfo(r) {
  return '<section class="kort"><p class="overlinje">' + esc(samtaleDag(r) + samtaleSted(r)) + '</p>'
    + '<h2>' + esc(r.title) + '</h2>'
    + (r.details ? '<p>' + esc(r.details) + '</p>' : '') + '</section>';
}

function samtaleSpiller(r) {
  const { tid, svar } = mittSamtaleSvar(r);
  /* I forhåndsvisningen ser treneren hvordan det blir når påmeldingen er åpen. */
  const apen = r.apen || Boolean(UI.visSom);
  const tider = tiderFor(r);
  const ledige = tider.filter((t) => t.ledig).length;
  let html = samtaleInfo(r);
  if (UI.visSom && !r.apen) html += '<p class="varsel ok">Påmeldingen er stengt. Slik ser det ut for spillerne når du har åpnet den.</p>';
  if (tid) {
    html += '<section class="kort uthevet"><p class="overlinje">Din tid</p>'
      + '<p class="tid-stor">' + esc(tidTekst(tid)) + '</p>'
      + '<p><strong>' + esc(dagInfo(tid.starts_at).lang) + '</strong>' + esc(samtaleSted(r)) + '</p>'
      + (apen
        ? '<p class="dempet liten">Vil du bytte, trykker du på en annen ledig tid under.</p>'
          + '<button type="button" class="lenkeknapp" data-handling="avbestill-samtale" data-samtale="' + esc(r.id) + '">Gi fra meg tiden</button>'
        : '<p class="dempet liten">Må du endre noe, send en melding til treneren.</p>')
      + '</section>';
  } else if (svar) {
    html += '<section class="kort uthevet"><p class="overlinje">Ditt svar</p>'
      + '<p><strong>' + esc(SAMTALE_VALG[svar.valg] || svar.valg) + '</strong></p>'
      + (svar.merknad ? '<p>' + esc(svar.merknad) + '</p>' : '')
      + '<p class="dempet liten">Treneren tar kontakt for å avtale.'
      + (apen && ledige ? ' Vil du heller ha en av tidene ' + esc(samtaleDag(r).toLowerCase()) + ', velger du en ledig tid under.' : '') + '</p></section>';
  }
  if (!apen) {
    if (!tid && !svar) {
      html += '<section class="kort tomt"><p><strong>Påmeldingen åpner snart</strong></p>'
        + '<p class="dempet liten">Du får beskjed i Hoopit når du kan booke.</p></section>';
    }
    return html;
  }
  html += '<section class="uke"><div class="ukehode"><h2>Velg tid</h2><span>'
    + (ledige ? ledige + ' av ' + tider.length + ' ledige' : 'Alle er tatt') + '</span></div>'
    + '<div class="liste">' + tiderMedPauser(tider).map(samtaleRad).join('') + '</div>'
    + (ledige ? '<p class="dempet liten">Først til mølla. Tar noen tiden rett før deg, får du beskjed og kan velge en annen.</p>' : '')
    + '</section>';
  const skjema = samtaleAnnenSkjema(r, svar, tid);
  html += tid || svar
    ? '<details class="kort del"><summary class="lenkeknapp">' + (tid ? 'Passer det ikke likevel?' : 'Endre svaret') + '</summary>' + skjema + '</details>'
    : '<section class="kort"><h2>Passer ikke?</h2><p class="dempet liten">'
      + (ledige ? 'Passer ingen av tidene' : 'Er alle tidene tatt') + '? Si hva som passer, så avtaler treneren med deg.</p>' + skjema + '</section>';
  return html;
}

function samtaleRad(t) {
  const tid = '<span class="tid">' + esc(tidTekst(t)) + '</span>';
  if (t.pause) return '<div class="rad samtale-tid pause">' + tid + '<span class="rad-tekst"><span class="under">Pause</span></span></div>';
  if (t.min) {
    return '<div class="rad samtale-tid min">' + tid + '<span class="rad-tekst"><span class="navn">Din tid</span></span>'
      + '<span class="merkelapp sone-gronn">Booket</span></div>';
  }
  if (!t.ledig) return '<div class="rad samtale-tid tatt">' + tid + '<span class="rad-tekst"><span class="under">Opptatt</span></span></div>';
  return '<button type="button" class="rad samtale-tid ledig" data-handling="book-samtale" data-id="' + esc(t.id) + '">' + tid
    + '<span class="rad-tekst"><span class="under">Ledig</span></span><span class="merkelapp velg">Book</span></button>';
}

function samtaleAnnenSkjema(r, svar, tid) {
  const id = 'smerknad-' + r.id;
  return '<form class="skjema" data-skjema="samtale-annen" novalidate><input type="hidden" name="samtale" value="' + esc(r.id) + '">'
    + '<fieldset class="felt"><legend>Hva passer best?</legend><div class="valg-rad">' + valgknapper('valg', SAMTALE_VALG, svar ? svar.valg : '') + '</div></fieldset>'
    + '<div class="felt"><label for="' + esc(id) + '">Når passer det? (valgfritt)</label><input id="' + esc(id) + '" name="merknad" maxlength="300" autocomplete="off"'
    + ' placeholder="F.eks. tirsdag etter trening" value="' + esc(svar && svar.merknad ? svar.merknad : '') + '"></div>'
    + (tid ? '<p class="dempet liten">Da gir du fra deg tiden ' + esc(tidTekst(tid)) + '.</p>' : '')
    + skjemafeil() + '<button class="knapp sekundar" type="submit">Send svar</button></form>';
}

function samtaleForelder(r) {
  const mine = tiderFor(r).filter((t) => t.min);
  const svar = S.samtaleSvar.filter((s) => s.samtale_id === r.id);
  let html = samtaleInfo(r);
  if (mine.length) {
    html += '<section class="kort uthevet"><p class="overlinje">Tiden til gutten din</p>'
      + mine.map((t) => '<p class="tid-stor">' + esc(tidTekst(t)) + '</p><p><strong>' + esc(dagInfo(t.starts_at).lang) + '</strong>' + esc(samtaleSted(r)) + '</p>').join('')
      + '</section>';
  } else if (svar.length) {
    html += '<section class="kort"><p class="overlinje">Gutten din har svart</p>'
      + svar.map((s) => '<p><strong>' + esc(SAMTALE_VALG[s.valg] || s.valg) + '</strong>' + (s.merknad ? ': ' + esc(s.merknad) : '') + '</p>').join('')
      + '<p class="dempet liten">Treneren tar kontakt for å avtale.</p></section>';
  } else {
    html += '<section class="kort tomt"><p>' + (r.apen
      ? 'Gutten din har ikke booket tid ennå. Spillerne booker selv i appen.'
      : 'Påmeldingen er ikke åpnet ennå. Spillerne booker selv i appen når den åpner.') + '</p></section>';
  }
  return html;
}

/* Treneren: hvem som har booket, hvem som har valgt annen løsning, og hvem som ikke har svart. */
function samtaleTall(r) {
  const t = S.trener;
  const tider = tiderFor(r, t.samtaleTider || []);
  const svar = S.samtaleSvar.filter((s) => s.samtale_id === r.id);
  const medTid = new Set(tider.filter((x) => x.player_id).map((x) => x.player_id));
  const medSvar = new Set(svar.map((s) => s.player_id));
  const aktive = t.spillere.filter((s) => s.active);
  return {
    tider,
    svar,
    medTid,
    medSvar,
    aktive,
    ikkeSvart: aktive.filter((s) => !medTid.has(s.id) && !medSvar.has(s.id))
  };
}

function samtaleTrenerKort() {
  if (!S.trener) return '';
  return aktiveSamtaler().map((r) => {
    const n = samtaleTall(r);
    return '<section class="kort uthevet"><div class="kort-topp"><p class="overlinje">' + esc(r.title) + '</p>'
      + (r.apen ? '<span class="merkelapp sone-gronn">Åpen</span>' : '<span class="merkelapp">Stengt</span>') + '</div>'
      + '<p><strong>' + esc(samtaleDag(r)) + ': ' + n.medTid.size + ' av ' + n.tider.length + ' tider booket</strong></p>'
      + '<p class="dempet liten">' + n.svar.length + ' annen løsning · ' + n.ikkeSvart.length + ' har ikke svart</p>'
      + '<a class="knapp liten-knapp" href="#/samtale">' + (r.apen ? 'Se oversikten' : 'Åpne påmeldingen') + '</a></section>';
  }).join('');
}

/* Fornavn, med forbokstav i etternavnet når flere har samme fornavn. */
function kortNavn(id, aktive) {
  const s = aktive.find((x) => x.id === id);
  if (!s) return spillerNavn(id);
  const deler = s.full_name.trim().split(/\s+/);
  const like = aktive.filter((x) => x.full_name.trim().split(/\s+/)[0] === deler[0]).length;
  return like > 1 && deler.length > 1 ? deler[0] + ' ' + deler[deler.length - 1].charAt(0) + '.' : deler[0];
}

function samtaleTimeplanTekst(r, n) {
  const sted = r.location ? ', ' + r.location.charAt(0).toLowerCase() + r.location.slice(1) : '';
  const linjer = ['Timeplan for samtalene ' + samtaleDag(r).toLowerCase() + sted + ':', ''];
  tiderMedPauser(n.tider).forEach((x) => {
    linjer.push(tidTekst(x) + '  ' + (x.pause ? 'Pause' : x.player_id ? kortNavn(x.player_id, n.aktive) : 'Ledig'));
  });
  linjer.push('', 'Har du ikke fått tid, tar jeg kontakt for å avtale.');
  return linjer.join('\n');
}

function visSamtaleTrener() {
  let html = '<div class="overskrift"><p class="overlinje">Bare for trenere</p><h1>Spillersamtaler</h1></div>';
  if (!S.trener) return html + '<section class="kort tomt"><p>Laster …</p></section>';
  if (S.samtaleFeil) return html + '<section class="kort tomt"><p>Fikk ikke hentet samtalene. Last siden på nytt.</p></section>';
  const runder = aktiveSamtaler();
  if (!runder.length) return html + '<section class="kort tomt"><p>Ingen kommende samtaler.</p></section>';
  return html + runder.map(samtaleTrener).join('');
}

function samtaleTrener(r) {
  const n = samtaleTall(r);
  let html = '<section class="kort"><div class="kort-topp"><p class="overlinje">' + esc(samtaleDag(r) + samtaleSted(r)) + '</p>'
    + (r.apen ? '<span class="merkelapp sone-gronn">Åpen</span>' : '<span class="merkelapp">Stengt</span>') + '</div>'
    + '<h2>' + esc(r.title) + '</h2>'
    + '<p class="dempet liten">' + (r.apen
      ? 'Spillerne kan booke, bytte og svare nå.'
      : 'Spillerne ser «Påmeldingen åpner snart» til du åpner. Åpne når du sender meldingen i Hoopit.') + '</p>'
    + '<button type="button" class="knapp' + (r.apen ? ' sekundar' : '') + '" data-handling="samtale-apen" data-id="' + esc(r.id) + '" data-apen="' + (r.apen ? 'nei' : 'ja') + '">'
    + (r.apen ? 'Steng påmeldingen' : 'Åpne påmeldingen') + '</button></section>';

  html += '<div class="tall-rad"><div><b>' + n.medTid.size + '/' + n.tider.length + '</b><span>har booket</span></div>'
    + '<div><b>' + n.svar.length + '</b><span>annen løsning</span></div>'
    + '<div><b>' + n.ikkeSvart.length + '</b><span>ikke svart</span></div></div>';

  html += '<section class="uke"><h2>Timeplan</h2><div class="liste">' + tiderMedPauser(n.tider).map((x) => {
    const tid = '<span class="tid">' + esc(tidTekst(x)) + '</span>';
    if (x.pause) return '<div class="rad samtale-tid pause">' + tid + '<span class="rad-tekst"><span class="under">Pause</span></span></div>';
    if (!x.player_id) return '<div class="rad samtale-tid tom">' + tid + '<span class="rad-tekst"><span class="under">Ledig</span></span></div>';
    return '<div class="rad samtale-tid">' + tid + '<span class="rad-tekst"><span class="navn">' + esc(spillerNavn(x.player_id)) + '</span></span>'
      + '<button type="button" class="lenkeknapp" data-handling="samtale-frigjor" data-id="' + esc(x.id) + '">Frigjør</button></div>';
  }).join('') + '</div></section>';

  const kandidater = n.aktive.filter((s) => !n.medTid.has(s.id));
  const ledige = n.tider.filter((x) => !x.player_id);
  if (kandidater.length && ledige.length) {
    html += '<section class="kort"><h2>Sett inn en spiller</h2>'
      + '<p class="dempet liten">For eksempel en som har ringt deg. Virker også når påmeldingen er stengt.</p>'
      + '<form class="skjema" data-skjema="samtale-sett-inn" novalidate>'
      + '<div class="felt"><label for="sispiller">Spiller</label><select id="sispiller" name="spiller"><option value="">Velg spiller</option>'
      + kandidater.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.full_name) + (n.medSvar.has(s.id) ? ' (annen løsning)' : '') + '</option>').join('')
      + '</select></div>'
      + '<div class="felt"><label for="sitid">Tid</label><select id="sitid" name="tid"><option value="">Velg tid</option>'
      + ledige.map((x) => '<option value="' + esc(x.id) + '">' + esc(tidTekst(x)) + '</option>').join('')
      + '</select></div>'
      + skjemafeil() + '<button class="knapp sekundar" type="submit">Sett inn</button></form></section>';
  }

  const svar = n.svar.slice().sort((a, b) => spillerNavn(a.player_id).localeCompare(spillerNavn(b.player_id), 'nb'));
  html += '<section class="uke"><h2>Annen løsning</h2>' + (svar.length
    ? '<div class="liste">' + svar.map((s) => '<div class="rad"><div class="rad-tekst"><span class="navn">' + esc(spillerNavn(s.player_id)) + '</span>'
      + '<span class="under">' + esc((SAMTALE_VALG[s.valg] || s.valg) + (s.merknad ? ': ' + s.merknad : '')) + '</span></div>'
      + '<button type="button" class="lenkeknapp" data-handling="samtale-fjern-svar" data-samtale="' + esc(r.id) + '" data-spiller="' + esc(s.player_id) + '">Fjern</button></div>').join('') + '</div>'
    : '<section class="kort tomt"><p class="dempet">Ingen har valgt annen løsning.</p></section>') + '</section>';

  html += '<section class="uke"><h2>Ikke svart</h2>' + (n.ikkeSvart.length
    ? '<div class="liste">' + n.ikkeSvart.map((s) => '<div class="rad"><div class="rad-tekst"><span class="navn">' + esc(s.full_name) + '</span></div></div>').join('') + '</div>'
    : '<section class="kort tomt"><p class="dempet">Alle har svart.</p></section>') + '</section>';

  const tekstId = 'stekst-' + r.id;
  html += '<section class="kort"><h2>Timeplan til Hoopit</h2>'
    + '<div class="felt"><label for="' + esc(tekstId) + '">Kopier og lim inn i Hoopit</label><textarea id="' + esc(tekstId) + '" readonly rows="8">'
    + esc(samtaleTimeplanTekst(r, n)) + '</textarea></div>'
    + '<button type="button" class="knapp sekundar" data-handling="kopier" data-kilde="' + esc(tekstId) + '">Kopier timeplanen</button></section>';
  return html;
}

/* Kjører en endring, henter tidene på nytt uansett utfall, og viser resultatet øverst. */
async function samtaleHandling(arbeid, takk) {
  await utfor(async () => {
    let feil = null;
    try {
      await arbeid();
    } catch (e) {
      if (e instanceof ApiFeil && e.status === 401) throw e;
      feil = e;
    }
    await lastSamtaler();
    UI.melding = feil ? '' : takk;
    tegn();
    window.scrollTo(0, 0);
    if (feil) alertFeil(feiltekst(feil));
  });
}

async function bookSamtale(el) {
  const t = S.samtaleTider.find((x) => x.id === el.dataset.id);
  if (!t || !t.ledig) return;
  const har = S.samtaleTider.find((x) => x.samtale_id === t.samtale_id && x.min);
  if (har && !window.confirm('Bytte fra ' + tidTekst(har) + ' til ' + tidTekst(t) + '?')) return;
  const takk = 'Du har fått ' + dagInfo(t.starts_at).lang.toLowerCase() + ' kl. ' + tidTekst(t) + '. Vi ses!';
  if (UI.visSom) {
    S.samtaleTider = S.samtaleTider.map((x) => {
      if (x.id === t.id) return Object.assign({}, x, { ledig: false, min: true });
      if (x.samtale_id === t.samtale_id && x.min) return Object.assign({}, x, { ledig: true, min: false });
      return x;
    });
    S.samtaleSvar = S.samtaleSvar.filter((s) => s.samtale_id !== t.samtale_id);
    UI.melding = 'Forhåndsvisning: tiden er ikke booket.';
    tegn();
    window.scrollTo(0, 0);
    return;
  }
  el.disabled = true;
  await samtaleHandling(() => api.rest('rpc/book_samtaletid', { metode: 'POST', kropp: { p_tid: t.id } }), takk);
}

/* ---------- Egentrening ---------- */

function visEgentrening() {
  const id = ruteParam('id');
  if (id) return visProgram(id);
  let html = '<div class="overskrift"><h1>Egentrening</h1><p class="dempet">Opplegg du kan gjøre på egen hånd eller med en makker. Trykk på et program for hele økta.</p></div>';
  if (!S.programmer.length) return html + '<section class="kort tomt"><p class="dempet">Programmene kommer her.</p></section>';
  for (const [kat, navn] of PROGRAM_GRUPPER) {
    const liste = S.programmer.filter((p) => p.category === kat);
    if (!liste.length) continue;
    html += '<section class="uke"><h2>' + esc(navn) + '</h2><div class="programliste">'
      + liste.map((p) => '<a class="program-boks" href="#/egentrening?id=' + esc(encodeURIComponent(p.id)) + '">'
        + '<span class="program-meta">' + esc([p.minutes ? p.minutes + ' min' : '', p.summary || ''].filter(Boolean).join(' · ')) + '</span>'
        + '<span class="program-navn">' + esc(p.title) + '</span>'
        + (p.purpose ? '<span class="program-tekst">' + esc(p.purpose) + '</span>' : '')
        + '<span class="pil" aria-hidden="true">›</span></a>').join('')
      + '</div></section>';
  }
  return html;
}

function visProgram(id) {
  const p = S.programmer.find((x) => x.id === id);
  if (!p) return '<div class="overskrift"><h1>Fant ikke programmet</h1></div><a class="knapp sekundar" href="#/egentrening">Til egentrening</a>';
  const gruppe = (PROGRAM_GRUPPER.find(([k]) => k === p.category) || [null, 'Annet'])[1];
  return '<div class="overskrift"><p class="overlinje">Egentrening · ' + esc(gruppe) + '</p><h1>' + esc(p.title) + '</h1>'
    + '<p class="dempet">' + esc([p.minutes ? p.minutes + ' min' : '', p.summary || ''].filter(Boolean).join(' · ')) + '</p></div>'
    + (p.purpose ? '<section class="kort tips"><p class="overlinje">Hensikt</p><p>' + esc(p.purpose) + '</p></section>' : '')
    + '<section class="kort tekst-md program">' + md(p.body) + '</section>'
    + '<a class="knapp sekundar" href="#/egentrening">Alle programmer</a>';
}

/* ---------- Feed: det trenerne deler ---------- */

/* Kilde, knappetekst og innebygd spiller for en delt lenke. Spilleren lastes først når noen trykker på videoen. */
function kildeFor(url) {
  let u = null;
  try {
    u = new URL(url);
  } catch (e) {
    return { navn: 'Lenke', type: 'lenke', handling: 'lenken', bilde: null, innbygg: null, format: '' };
  }
  const vert = u.hostname.replace(/^(www|m)\./, '');
  const sti = u.pathname;
  if (vert === 'youtu.be' || vert.endsWith('youtube.com')) {
    const treff = sti.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
    const id = vert === 'youtu.be' ? sti.slice(1).split('/')[0] : (u.searchParams.get('v') || (treff && treff[1]) || '');
    const gyldig = /^[\w-]{6,20}$/.test(id);
    return {
      navn: 'YouTube', type: 'youtube', handling: 'videoen',
      bilde: gyldig ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : null,
      innbygg: gyldig ? 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0' : null,
      format: sti.startsWith('/shorts/') ? 'staaende' : 'bred'
    };
  }
  if (vert.endsWith('vimeo.com')) {
    const m = sti.match(/^\/(?:video\/)?(\d+)(?:\/([0-9a-f]{6,}))?/);
    const h = (m && m[2]) || u.searchParams.get('h') || '';
    return {
      navn: 'Vimeo', type: 'vimeo', handling: 'videoen', bilde: null,
      innbygg: m ? 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1&dnt=1' + (/^[0-9a-f]+$/.test(h) ? '&h=' + h : '') : null,
      format: 'bred'
    };
  }
  if (vert.endsWith('tiktok.com')) {
    const m = sti.match(/\/video\/(\d+)/);
    return {
      navn: 'TikTok', type: 'tiktok', handling: 'videoen', bilde: null,
      innbygg: m ? 'https://www.tiktok.com/player/v1/' + m[1] + '?autoplay=1&rel=0' : null,
      format: 'staaende'
    };
  }
  if (vert.endsWith('instagram.com')) {
    const m = sti.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/);
    const type = m ? (m[1].startsWith('reel') ? 'reel' : m[1]) : '';
    return {
      navn: 'Instagram', type: 'instagram', handling: 'innlegget', bilde: null,
      innbygg: m ? 'https://www.instagram.com/' + type + '/' + m[2] + '/embed/captioned/' : null,
      format: type === 'p' ? 'insta' : 'staaende'
    };
  }
  return { navn: vert, type: 'artikkel', handling: 'lenken', bilde: null, innbygg: null, format: '' };
}

function erVideo(k) {
  return ['youtube', 'vimeo', 'tiktok', 'instagram'].includes(k.type);
}

function feedHode(kilde, tidspunkt) {
  return '<header class="feed-hode"><img src="img/kolbotn-logo.png" alt="" width="26" height="32">'
    + '<span><b>Trenerne i TG1</b><span>' + esc(kilde + ' · ' + datoUtenAar(osloDatoStr(new Date(tidspunkt)))) + '</span></span></header>';
}

/* Sider en beskjed i feeden kan lenke til. Samme mønster som i databasen. */
const RUTE_RE = /^[a-z]+(\?[a-z0-9=&_.-]+)?$/;
const RUTE_NAVN = { egentrening: 'Egentrening', kalender: 'Kalender', uke: 'Denne uka', spillmodell: 'Spillmodell', plan: 'Utviklingsplan 2027', mer: 'Mer', meg: 'Meg', samtale: 'Spillersamtale' };

/* Beskjed fra trenerne: bilde, tekst og en knapp til en side i appen. */
function beskjedKort(i) {
  const rute = i.route && RUTE_RE.test(i.route) && RUTE_NAVN[i.route.split('?')[0]] ? i.route : '';
  const handlinger = S.profil.role === 'trener'
    ? '<div class="feed-handlinger"><button type="button" class="lenkeknapp" data-handling="slett-inspirasjon" data-id="' + esc(i.id) + '">Slett</button></div>' : '';
  return '<article class="feed-kort beskjed">' + feedHode('Beskjed', i.created_at)
    + (i.image_id ? '<div class="feed-media foto"><img data-bilde="' + esc(i.image_id) + '" alt=""></div>' : '')
    + '<div class="feed-tekst"><h3>' + esc(i.title) + '</h3>' + (i.note ? '<p>' + esc(i.note) + '</p>' : '') + '</div>'
    + (rute ? '<a class="feed-lenke" href="#/' + esc(rute) + '"><span>I appen</span><span>Gå til ' + esc(RUTE_NAVN[rute.split('?')[0]]) + ' ›</span></a>' : '')
    + handlinger + '</article>';
}

/*
 * Bilder i feeden ligger kryptert i img/feed/ i det offentlige repoet. Nøkkelen ligger i tabellen
 * media, som bare innloggede medlemmer kan lese. Nettleseren dekrypterer bildet og viser det som blob.
 */
const BILDER = new Map();

function b64TilBytes(b64) {
  const s = atob(b64);
  const ut = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) ut[i] = s.charCodeAt(i);
  return ut;
}

async function dekrypterBilde(id) {
  const rader = await api.rest('media?id=eq.' + encodeURIComponent(id) + '&select=id,path,mime,nokkel,iv,alt');
  const m = rader && rader[0];
  if (!m || !/^img\/feed\/[a-z0-9]{16,64}\.bin$/.test(m.path)) return null;
  const svar = await fetch(m.path);
  if (!svar.ok) return null;
  const nokkel = await crypto.subtle.importKey('raw', b64TilBytes(m.nokkel), 'AES-GCM', false, ['decrypt']);
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64TilBytes(m.iv) }, nokkel, await svar.arrayBuffer());
  return { url: URL.createObjectURL(new Blob([data], { type: m.mime })), alt: m.alt || '' };
}

function hentBilde(id) {
  if (!BILDER.has(id)) BILDER.set(id, dekrypterBilde(id).catch(() => null));
  return BILDER.get(id);
}

/* Fyller inn bildene etter at siden er tegnet. */
function visBilder() {
  document.querySelectorAll('img[data-bilde]').forEach((img) => {
    const boks = img.closest('.feed-media');
    hentBilde(img.dataset.bilde).then((b) => {
      if (b) {
        img.alt = b.alt;
        img.src = b.url;
        if (boks) boks.classList.add('lastet');
      } else if (boks) {
        boks.classList.add('feil');
      }
    });
  });
}

/* Ett kort i feeden. Videoer spilles i kortet, artikler får et lenkekort, beskjeder har bilde og knapp. */
function feedKort(i) {
  if (!i.url) return beskjedKort(i);
  const k = kildeFor(i.url);
  const lenke = ' href="' + esc(i.url) + '" target="_blank" rel="noopener noreferrer"';
  const plakat = (k.bilde ? '<img src="' + esc(k.bilde) + '" alt="" loading="lazy">'
    : '<span class="feed-plakat"><b>' + esc(k.navn) + '</b><span>' + esc(i.title) + '</span></span>')
    + '<span class="spill" aria-hidden="true"></span>';
  let media = '';
  if (k.innbygg) {
    media = '<button type="button" class="feed-media ' + esc(k.type + ' ' + k.format) + '" data-handling="spill" data-id="' + esc(i.id) + '" aria-label="Spill av: ' + esc(i.title) + '">' + plakat + '</button>';
  } else if (erVideo(k)) {
    media = '<a class="feed-media ' + esc(k.type + ' ' + (k.format || 'bred')) + '"' + lenke + ' aria-label="Åpne i ' + esc(k.navn) + '">' + plakat + '</a>';
  }
  const handlinger = [];
  if (erVideo(k)) handlinger.push('<a class="lenkeknapp"' + lenke + '>Åpne i ' + esc(k.navn) + '</a>');
  if (S.profil.role === 'trener') handlinger.push('<button type="button" class="lenkeknapp" data-handling="slett-inspirasjon" data-id="' + esc(i.id) + '">Slett</button>');
  return '<article class="feed-kort">' + feedHode(k.navn, i.created_at)
    + media
    + '<div class="feed-tekst"><h3>' + esc(i.title) + '</h3>' + (i.note ? '<p>' + esc(i.note) + '</p>' : '') + '</div>'
    + (erVideo(k) ? '' : '<a class="feed-lenke"' + lenke + '><span>' + esc(k.navn) + '</span><span>Les ' + (k.type === 'artikkel' ? 'artikkelen' : 'mer') + ' ›</span></a>')
    + (handlinger.length ? '<div class="feed-handlinger">' + handlinger.join('') + '</div>' : '')
    + '</article>';
}

/* ---------- Min kalender ---------- */

function tidKort(t) {
  return t ? String(t).slice(0, 5).replace(':', '.') : '';
}

function tidInput(t) {
  return t ? String(t).slice(0, 5) : '';
}

function ukeFraParam() {
  const p = ruteParam('uke');
  return mandagFor(/^\d{4}-\d{2}-\d{2}$/.test(p) ? datoFraStr(p) : new Date());
}

function ukeNavigasjon(mandag, lenke) {
  const forrige = new Date(mandag.getTime() - 7 * DAG_MS).toISOString().slice(0, 10);
  const neste = new Date(mandag.getTime() + 7 * DAG_MS).toISOString().slice(0, 10);
  return '<div class="ukenav"><a class="ukepil" href="' + esc(lenke + forrige) + '" aria-label="Forrige uke">‹</a>'
    + '<p><strong>Uke ' + isoUke(mandag) + '</strong><span>' + esc(ukeTekst(mandag)) + '</span></p>'
    + '<a class="ukepil" href="' + esc(lenke + neste) + '" aria-label="Neste uke">›</a></div>';
}

/* Ukeplan med lagets økter og spillerens egne oppføringer, dag for dag. */
/* For spilleren: lagt inn av noen andre enn ham selv, altså en trener. Treneren kan endre alt. */
function lagtInnAvTrener(o) {
  return S.profil.role === 'spiller' && Boolean(o.created_by) && o.created_by !== S.profil.id;
}

function ukeplan(mandag, oppforinger, redigerbar) {
  const idag = idagStr();
  let html = '<div class="ukeplan">';
  for (let i = 0; i < 7; i++) {
    const dag = new Date(mandag.getTime() + i * DAG_MS);
    const datoStr = dag.toISOString().slice(0, 10);
    const poster = [];
    for (const h of S.hendelser) {
      if (h.status === 'avlyst' || osloDatoStr(new Date(h.starts_at)) !== datoStr) continue;
      poster.push({ sort: klokke(h.starts_at), tid: tidTekst(h), navn: h.title, under: h.location || '', klasse: 'kat-lag' });
    }
    for (const o of oppforinger) {
      if (!((o.weekdays && o.weekdays.includes(i + 1)) || o.on_date === datoStr)) continue;
      const kat = KAL_KATEGORI[o.category] || KAL_KATEGORI.annet;
      const fraTrener = lagtInnAvTrener(o);
      poster.push({
        sort: tidKort(o.starts),
        tid: tidKort(o.starts) + (o.ends ? '–' + tidKort(o.ends) : ''),
        navn: o.title || kat.navn,
        under: [fraTrener ? 'Fra treneren' : '', o.title ? kat.navn : '', o.note || ''].filter(Boolean).join(' · '),
        klasse: kat.klasse,
        id: fraTrener ? null : o.id,
        fast: Boolean(o.weekdays)
      });
    }
    poster.sort((a, b) => a.sort.localeCompare(b.sort));
    html += '<section class="dagblokk' + (datoStr === idag ? ' idag' : '') + '"><h3>' + esc(UKEDAG_LANG[i])
      + ' <span>' + pad(dag.getUTCDate()) + '.' + pad(dag.getUTCMonth() + 1) + (datoStr === idag ? ' · i dag' : '') + '</span></h3>';
    html += poster.length
      ? '<ul class="dagliste">' + poster.map((p) => {
        const inni = '<span class="tid">' + esc(p.tid) + '</span><span class="post-tekst"><span class="post-navn">' + esc(p.navn) + '</span>'
          + (p.under ? '<span class="post-under">' + esc(p.under) + '</span>' : '') + '</span>'
          + (p.fast ? '<span class="fast" aria-label="Hver uke">↻</span>' : '');
        return '<li class="post ' + p.klasse + '">'
          + (redigerbar && p.id ? '<a href="#/oppforing?id=' + esc(encodeURIComponent(p.id)) + '">' + inni + '</a>' : '<div>' + inni + '</div>') + '</li>';
      }).join('') + '</ul>'
      : '<p class="dempet liten">Ingenting lagt inn</p>';
    html += '</section>';
  }
  return html + '</div>';
}

/* Trenernes knapper for kalenderen, øverst på Kalender og på trenersiden. */
function kalenderVerktoy(medTittel) {
  if (!erTrener()) return '';
  return '<section class="kort verktoy">' + (medTittel ? '<h2>Kalender</h2>' : '')
    + '<a class="knapp liten-knapp" href="#/hendelse">+ Ny økt for laget</a>'
    + '<a class="knapp sekundar liten-knapp" href="#/oppforing' + (medTittel ? '' : '?fra=kalender') + '">For enkeltspillere</a>'
    + '<p class="dempet liten">Ny økt vises for alle spillerne. «Enkeltspillere» er for det som bare gjelder noen, som JR1-trening, og havner i Min kalender til dem du velger. '
    + (medTittel ? 'Under Kalender kan du trykke på en økt for å endre, avlyse eller slette den.' : 'Trykk på en økt i lista for å endre, avlyse eller slette den.') + '</p></section>';
}

function kalenderValg() {
  if (S.profil.role !== 'spiller') return '';
  const min = ruteParam('vis') === 'min';
  return '<nav class="segment" aria-label="Velg kalender"><a href="#/kalender"' + (min ? '' : ' aria-current="page"') + '>Laget</a>'
    + '<a href="#/kalender?vis=min"' + (min ? ' aria-current="page"' : '') + '>Min kalender</a></nav>';
}

function utenSamtykkeKalender() {
  return '<section class="kort tomt"><p>Foresatte må gi samtykke før du kan bruke Min kalender.</p>'
    + '<p class="dempet liten">Be dem logge inn med koden de har fått fra treneren, og godkjenne under «Meg».</p></section>';
}

function visMinKalender() {
  if (!harSamtykke(S.profil.player_id)) return utenSamtykkeKalender();
  const mandag = ukeFraParam();
  let html = '';
  if (!S.kalender.length) {
    html += '<section class="kort tips"><p class="overlinje">Kom i gang</p>'
      + '<p>Legg inn det som er fast hver uke: skole, kroppsøving, annen trening, måltider og når du legger deg.</p>'
      + '<p class="dempet liten">Treneren ser kalenderen din og kan tilpasse treningen. Foreldre ser den ikke.</p></section>';
  }
  html += '<a class="knapp" href="#/oppforing">Legg til</a>'
    + ukeNavigasjon(mandag, '#/kalender?vis=min&uke=')
    + ukeplan(mandag, S.kalender, true);
  if (S.kalender.length) {
    html += '<p class="dempet liten">Trykk på noe du har lagt inn for å endre det. ↻ betyr at det gjentas hver uke. Det som er merket «Fra treneren», endrer treneren. Treneren ser kalenderen din, foreldre gjør det ikke.</p>';
  }
  return html;
}

function visOppforing() {
  const trener = S.profil.role === 'trener';
  const kilde = trener ? ((S.trener && S.trener.kalender) || []) : S.kalender;
  const id = ruteParam('id');
  const o = id ? kilde.find((x) => x.id === id) : null;
  const valgt = o ? [o.player_id] : (trener ? ruteParam('spiller').split(',').filter(Boolean) : []);
  const fraKalender = trener && ruteParam('fra') === 'kalender';
  const tilbake = !trener ? '#/kalender?vis=min'
    : (valgt.length === 1 ? '#/spiller?id=' + encodeURIComponent(valgt[0]) : (fraKalender ? '#/kalender' : '#/trener'));
  let html = '<div class="overskrift"><p class="overlinje">' + (trener ? 'Spillernes kalender' : 'Min kalender') + '</p>'
    + '<h1>' + (o ? 'Endre' : 'Legg til') + '</h1>'
    + (trener && o ? '<p class="dempet">' + esc(spillerNavn(o.player_id)) + '</p>' : '') + '</div>';
  if (id && !o) {
    return html + '<section class="kort tomt"><p>Fant ikke det som er lagt inn.</p></section><a class="knapp sekundar" href="' + esc(tilbake) + '">Tilbake</a>';
  }
  if (o && lagtInnAvTrener(o)) {
    return html + '<section class="kort tomt"><p>Dette er lagt inn av treneren. Si fra til treneren hvis noe er feil.</p></section>'
      + '<a class="knapp sekundar" href="' + esc(tilbake) + '">Tilbake</a>';
  }
  if (!trener && !harSamtykke(S.profil.player_id)) return html + utenSamtykkeKalender();
  const v = o || { category: trener ? 'trening' : 'skole', weekdays: null, on_date: null, starts: '', ends: '', title: '', note: '' };
  const dager = v.weekdays || [];
  html += '<form class="skjema" data-skjema="oppforing" novalidate><input type="hidden" name="id" value="' + esc(v.id || '') + '">'
    + '<input type="hidden" name="spiller" value="' + esc(o ? o.player_id : '') + '">'
    + (fraKalender ? '<input type="hidden" name="fra" value="kalender">' : '');
  if (trener && !o) {
    const spillere = S.trener.spillere.filter((x) => x.active).sort((a, b) => a.full_name.localeCompare(b.full_name, 'nb'));
    html += '<section class="kort"><fieldset class="felt"><legend>Hvem gjelder det?</legend><div class="spillervalg">'
      + spillere.map((x) => '<label class="sjekkrad"><input type="checkbox" name="sp-' + esc(x.id) + '" value="1"'
        + (valgt.includes(x.id) ? ' checked' : '') + '><span>' + esc(x.full_name) + '</span></label>').join('')
      + '</div></fieldset><p class="dempet liten">Det du legger inn, vises som «Fra treneren» i Min kalender til spillerne du velger. De kan ikke endre det selv.</p></section>';
  }
  html += '<section class="kort"><fieldset class="felt"><legend>Hva gjelder det?</legend><div class="valg-rad kategorier">'
    + Object.entries(KAL_KATEGORI).map(([k, kat]) => '<label class="valg"><input type="radio" name="kat" value="' + k + '"'
      + (v.category === k ? ' checked' : '') + '><span>' + esc(kat.navn) + '</span></label>').join('')
    + '</div></fieldset>'
    + '<div class="felt"><label for="onavn">Navn (valgfritt)</label><input id="onavn" name="navn" maxlength="60" autocomplete="off" placeholder="'
    + (trener ? 'F.eks. JR1-trening' : 'F.eks. Hospitering med G16') + '" value="' + esc(v.title || '') + '"></div>'
    + '</section><section class="kort">'
    + '<fieldset class="felt"><legend>Hver uke</legend><div class="valg-rad ukedager">'
    + UKEDAG_KORT.map((d, i) => '<label class="valg"><input type="checkbox" name="dag' + (i + 1) + '" value="1"'
      + (dager.includes(i + 1) ? ' checked' : '') + '><span>' + d + '</span></label>').join('')
    + '</div></fieldset>'
    + '<div class="felt"><label for="odato">Eller én bestemt dag</label><input id="odato" name="dato" type="date" value="' + esc(v.on_date || '') + '"></div>'
    + '<div class="to-kol"><div class="felt"><label for="ofra">Fra</label><input id="ofra" name="fra" type="time" value="' + esc(tidInput(v.starts)) + '"></div>'
    + '<div class="felt"><label for="otil">Til (valgfritt)</label><input id="otil" name="til" type="time" value="' + esc(tidInput(v.ends)) + '"></div></div>'
    + (trener ? '' : '<p class="dempet liten">Søvn: «Fra» er når du legger deg, og «Til» er når du står opp.</p>')
    + '<div class="felt"><label for="onotat">Notat (valgfritt)</label><input id="onotat" name="notat" maxlength="200" autocomplete="off" value="' + esc(v.note || '') + '"></div>'
    + '</section>' + skjemafeil() + '<button class="knapp" type="submit">Lagre</button></form>';
  if (o) html += '<button type="button" class="lenkeknapp" data-handling="slett-oppforing" data-id="' + esc(o.id) + '">Slett fra kalenderen</button>';
  return html + '<a class="lenkeknapp" href="' + esc(tilbake) + '">Avbryt</a>';
}

/* ---------- Lagets kalender: ny økt og endre økt (trenere) ---------- */

function hendelseVerdier(h) {
  if (!h) {
    const dato = ruteParam('dato');
    return {
      type: 'trening', navn: '', dato: DATO_RE.test(dato) ? dato : '',
      oppmote: NY_OKT.oppmote, start: NY_OKT.start, slutt: NY_OKT.slutt, sted: NY_OKT.sted,
      motstander: '', tema: '', hvorfor: '', opplegg: '', status: 'bekreftet'
    };
  }
  return {
    type: h.kind, navn: h.title || '', dato: osloDatoStr(new Date(h.starts_at)),
    oppmote: inputTid(h.meet_at), start: inputTid(h.starts_at), slutt: inputTid(h.ends_at), sted: h.location || '',
    motstander: h.opponent || '', tema: h.theme || '', hvorfor: h.why || '', opplegg: h.details || '', status: h.status || 'bekreftet'
  };
}

function valgknapper(navn, valg, valgt) {
  return Object.entries(valg).map(([k, tekst]) => '<label class="valg"><input type="radio" name="' + navn + '" value="' + esc(k) + '"'
    + (k === valgt ? ' checked' : '') + '><span>' + esc(tekst) + '</span></label>').join('');
}

function visHendelse() {
  const id = ruteParam('id');
  const h = id ? S.hendelser.find((x) => x.id === id) : null;
  let html = '<div class="overskrift"><p class="overlinje">Lagets kalender</p><h1>' + (id ? 'Endre økt' : 'Ny økt') + '</h1>'
    + (h ? '<p class="dempet">' + esc(dagInfo(h.starts_at).lang + ' · ' + tidTekst(h) + ' · ' + h.title) + '</p>'
      : (id ? '' : '<p class="dempet">Vises med en gang for alle spillerne under Kalender og Denne uka.</p>')) + '</div>';
  if (id && !h) {
    return html + '<section class="kort tomt"><p>Fant ikke økta. Den kan være slettet.</p></section>'
      + '<a class="knapp sekundar" href="#/kalender">Tilbake til kalenderen</a>';
  }
  const v = hendelseVerdier(h);
  html += '<form class="skjema" data-skjema="hendelse" novalidate><input type="hidden" name="id" value="' + esc(h ? h.id : '') + '">'
    + '<section class="kort"><fieldset class="felt"><legend>Hva slags</legend><div class="valg-rad">' + valgknapper('type', HENDELSE_TYPE, v.type) + '</div></fieldset>'
    + '<div class="felt"><label for="hnavn">Navn (valgfritt)</label><input id="hnavn" name="navn" maxlength="80" autocomplete="off" placeholder="Fellestrening" value="' + esc(v.navn) + '">'
    + '<p class="hjelp">Tomt blir «Fellestrening», «Kamp mot …» og så videre.</p></div>'
    + '<div class="felt"><label for="hmot">Motstander (kamp)</label><input id="hmot" name="motstander" maxlength="80" autocomplete="off" value="' + esc(v.motstander) + '"></div></section>'
    + '<section class="kort"><div class="felt"><label for="hdato">Dato</label><input id="hdato" name="dato" type="date" required value="' + esc(v.dato) + '"></div>'
    + '<div class="tre-kol">'
    + '<div class="felt"><label for="hoppmote">Oppmøte</label><input id="hoppmote" name="oppmote" type="time" value="' + esc(v.oppmote) + '"></div>'
    + '<div class="felt"><label for="hstart">Start</label><input id="hstart" name="start" type="time" required value="' + esc(v.start) + '"></div>'
    + '<div class="felt"><label for="hslutt">Slutt</label><input id="hslutt" name="slutt" type="time" value="' + esc(v.slutt) + '"></div></div>'
    + '<div class="felt"><label for="hsted">Sted</label><input id="hsted" name="sted" maxlength="80" autocomplete="off" value="' + esc(v.sted) + '"></div>'
    + (h ? '' : '<div class="felt"><label for="hgjenta">Gjenta hver uke til og med (valgfritt)</label><input id="hgjenta" name="gjenta" type="date">'
      + '<p class="hjelp">Samme ukedag og tid hver uke, maks ' + MAKS_UKER + ' uker. Hver økt kan endres for seg etterpå.</p></div>')
    + '</section>'
    + '<section class="kort"><div class="felt"><label for="htema">Tema (valgfritt)</label><input id="htema" name="tema" maxlength="120" autocomplete="off" placeholder="F.eks. Vende opp mellom linjene" value="' + esc(v.tema) + '"></div>'
    + '<div class="felt"><label for="hhvorfor">Hvorfor (valgfritt)</label><input id="hhvorfor" name="hvorfor" maxlength="200" autocomplete="off" value="' + esc(v.hvorfor) + '"></div>'
    + '<div class="felt"><label for="hopplegg">Opplegg (valgfritt)</label><textarea id="hopplegg" name="opplegg" maxlength="4000" placeholder="F.eks. dobbelrondo, possession og småbanespill">' + esc(v.opplegg) + '</textarea>'
    + '<p class="hjelp">Spillerne ser tema, hvorfor og opplegg når de trykker på økta.</p></div></section>'
    + '<section class="kort"><fieldset class="felt"><legend>Status</legend><div class="valg-rad">' + valgknapper('status', HENDELSE_STATUS, v.status) + '</div></fieldset>'
    + '<p class="dempet liten">Planlagt betyr at den ikke er bekreftet ennå. Avlyst blir stående med strek over, og den kan ikke logges.</p></section>'
    + skjemafeil() + '<button class="knapp" type="submit">' + (h ? 'Lagre endringer' : 'Legg inn') + '</button></form>';
  if (h) {
    const logget = S.trener ? S.trener.logger.filter((l) => l.event_id === h.id).length : 0;
    html += logget
      ? '<p class="dempet liten">' + logget + (logget === 1 ? ' spiller har' : ' spillere har') + ' logget denne økta, så den kan ikke slettes. Velg «Avlyst» hvis den ikke blir noe av.</p>'
        + '<a class="lenkeknapp" href="#/okt?id=' + esc(encodeURIComponent(h.id)) + '">Se loggene</a>'
      : '<button type="button" class="lenkeknapp" data-handling="slett-hendelse" data-id="' + esc(h.id) + '">Slett økta</button>';
  }
  return html + '<a class="lenkeknapp" href="#/kalender">Avbryt</a>';
}

/* ---------- Logg etter økt ---------- */

function visLogg() {
  const h = S.hendelser.find((x) => x.id === ruteParam('okt'));
  let html = '<div class="overskrift"><p class="overlinje">Logg økta</p>'
    + '<h1>' + (h ? esc(dagInfo(h.starts_at).lang) : 'Fant ikke økta') + '</h1>'
    + (h ? '<p class="dempet">' + esc(h.title + ' · ' + tidTekst(h)) + '</p>' : '') + '</div>';
  if (!h) return html + '<a class="knapp sekundar" href="#/meg">Til mine økter</a>';
  if (!harSamtykke(S.profil.player_id)) {
    return html + '<section class="kort tomt"><p>Foresatte må gi samtykke før du kan logge økter.</p>'
      + '<p class="dempet liten">Be dem logge inn med koden de har fått fra treneren, og godkjenne under «Meg».</p></section>';
  }
  const logg = loggFor(h.id);
  if (!kanLogges(h)) {
    const grunn = h.status === 'avlyst' ? 'Økta er avlyst.'
      : new Date(h.starts_at).getTime() > Date.now() ? 'Du kan logge økta når den har startet.'
        : 'Det er mer enn ' + LOGG_DAGER + ' dager siden økta, så den kan ikke logges lenger.';
    return html + '<section class="kort tomt"><p>' + esc(grunn) + '</p></section>'
      + '<a class="knapp sekundar" href="#/meg">Til mine økter</a>';
  }
  const v = logg || {};
  const rpe = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<label class="valg"><input type="radio" name="rpe" value="' + n + '"'
    + (v.rpe === n ? ' checked' : '') + '><span>' + n + '</span></label>').join('');
  const smerte = ['nei', 'litt', 'mye'].map((s) => '<label class="valg"><input type="radio" name="smerte" value="' + s + '"'
    + ((v.pain || 'nei') === s ? ' checked' : '') + '><span>' + SMERTE_NAVN[s] + '</span></label>').join('');
  const bra = [1, 2, 3].map((i) => '<div class="felt nummerert"><label for="lbra' + i + '">' + i + '.</label>'
    + '<input id="lbra' + i + '" name="bra' + i + '" maxlength="120" autocomplete="off" placeholder="' + esc(BRA_EKSEMPEL[i - 1]) + '" value="' + esc(v['good_' + i] || '') + '"></div>').join('');
  html += '<form class="skjema" data-skjema="logg" novalidate>'
    + '<input type="hidden" name="okt" value="' + esc(h.id) + '">'
    + '<section class="kort"><fieldset class="felt"><legend>Hvor hard var økta for deg?</legend>'
    + '<div class="rpe">' + rpe + '</div>'
    + '<p class="skala"><span>1 veldig lett</span><span>5 hard</span><span>10 maks</span></p></fieldset>'
    + '<div class="to-kol">'
    + '<div class="felt"><label for="lmin">Minutter du var med</label><input id="lmin" name="minutter" inputmode="numeric" maxlength="3" value="' + esc(v.minutes || minutterFor(h)) + '"></div>'
    + '<fieldset class="felt"><legend>Smerter etter økta?</legend><div class="valg-rad">' + smerte + '</div></fieldset>'
    + '</div>'
    + '<div class="felt"><label for="lhvor">Hvor har du vondt? (hvis du har smerter)</label><input id="lhvor" name="hvor" maxlength="80" autocomplete="off" placeholder="F.eks. kneet" value="' + esc(v.pain_where || '') + '"></div>'
    + '</section>'
    + '<section class="kort"><h2>Tre ting som var bra</h2>' + bra
    + '<h2>Én ting å bli bedre på</h2>'
    + '<div class="felt"><label class="skjult" for="lbedre">Én ting å bli bedre på</label><input id="lbedre" name="bedre" maxlength="160" autocomplete="off" placeholder="F.eks. raskere i posisjon etter balltap" value="' + esc(v.improve || '') + '"></div>'
    + '</section>'
    + skjemafeil()
    + '<button class="knapp" type="submit">' + (logg ? 'Lagre endringer' : 'Lagre loggen') + '</button></form>';
  if (logg && Date.now() - new Date(logg.created_at).getTime() < LOGG_DAGER * DAG_MS) {
    html += '<button type="button" class="lenkeknapp" data-handling="slett-logg" data-id="' + esc(logg.id) + '">Slett loggen</button>';
  }
  return html;
}

/* ---------- Utviklingsmål ---------- */

function visMal() {
  const trener = S.profil.role === 'trener';
  const kilde = trener ? (S.trener ? S.trener.mal : []) : S.mal;
  const id = ruteParam('id');
  const m = id ? kilde.find((x) => x.id === id) : null;
  const spillerId = m ? m.player_id : (trener ? ruteParam('spiller') : S.profil.player_id);
  const apne = apnePerioder();
  const periodeId = m ? m.period_id : (ruteParam('periode') || (apne[0] && apne[0].id) || '');
  const periode = S.perioder.find((p) => p.id === periodeId);
  const tilbake = trener ? '#/spiller?id=' + encodeURIComponent(spillerId) : '#/meg';
  let html = '<div class="overskrift"><p class="overlinje">' + esc(periode ? periodeTittel(periode.id) : 'Utviklingsmål') + '</p>'
    + '<h1>' + (m ? 'Endre mål' : 'Nytt mål') + '</h1>'
    + (trener ? '<p class="dempet">' + esc(spillerNavn(spillerId)) + '</p>' : '') + '</div>';
  if ((id && !m) || !periode || (trener && !spillerId)) {
    return html + '<section class="kort tomt"><p>Fant ikke målet eller perioden.</p></section><a class="knapp sekundar" href="' + esc(tilbake) + '">Tilbake</a>';
  }
  const aapen = apne.some((p) => p.id === periode.id);
  if (!trener && !m && !aapen) {
    return html + '<section class="kort tomt"><p>Perioden er over. Du kan sette mål for perioden nå og den neste.</p></section>'
      + '<a class="knapp sekundar" href="#/meg">Tilbake</a>';
  }
  if (!trener && m && !aapen && !kanEvaluere(periode.id)) {
    return html + '<section class="kort">' + malBlokk(m, null, false) + '</section>'
      + '<p class="dempet liten">Perioden er over, så målet kan ikke endres lenger.</p><a class="knapp sekundar" href="#/meg">Tilbake</a>';
  }
  if (!m && kilde.filter((x) => x.player_id === spillerId && x.period_id === periode.id).length >= 3) {
    return html + '<section class="kort tomt"><p>Det er allerede tre mål i denne perioden. Endre eller slett et av dem først.</p></section>'
      + '<a class="knapp sekundar" href="' + esc(tilbake) + '">Tilbake</a>';
  }
  if (periode.focus) {
    html += '<section class="kort tips"><p class="overlinje">Periodens fokus</p><p>' + esc(periode.focus) + '</p>'
      + '<p class="dempet liten">Et godt mål er noe treneren kan se på trening og i kamp. For eksempel: «Bruke svak fot i pasningsøvelser og småbanespill».</p></section>';
  }
  const v = m || {};
  html += '<form class="skjema" data-skjema="mal" novalidate>'
    + '<input type="hidden" name="id" value="' + esc(v.id || '') + '">'
    + '<input type="hidden" name="spiller" value="' + esc(spillerId) + '">'
    + '<input type="hidden" name="periode" value="' + esc(periode.id) + '">'
    + '<section class="kort">'
    + '<div class="felt"><label for="mmal">' + (trener ? 'Målet' : 'Hva vil du bli bedre på?') + '</label>'
    + '<textarea id="mmal" name="mal" maxlength="160" rows="2" placeholder="F.eks. scanne før jeg får ballen">' + esc(v.goal || '') + '</textarea></div>'
    + '<div class="felt"><label for="mhvordan">Slik jobber ' + (trener ? 'spilleren' : 'jeg') + ' med det</label>'
    + '<textarea id="mhvordan" name="hvordan" maxlength="240" rows="3" placeholder="F.eks. se over skulderen to ganger før ballen kommer, særlig i possession">' + esc(v.how || '') + '</textarea></div>';
  if (m) {
    html += '<fieldset class="felt"><legend>Status</legend><div class="valg-rad fire">'
      + Object.entries(MAL_STATUS).map(([k, s]) => '<label class="valg"><input type="radio" name="status" value="' + k + '"'
        + (v.status === k ? ' checked' : '') + '><span>' + esc(s.navn) + '</span></label>').join('')
      + '</div></fieldset>'
      + '<div class="felt"><label for="mrefl">Hvordan gikk det?</label>'
      + '<textarea id="mrefl" name="refleksjon" maxlength="300" rows="3">' + esc(v.reflection || '') + '</textarea></div>';
  }
  if (trener) {
    html += '<div class="felt"><label for="mkomm">Kommentar fra trener</label>'
      + '<textarea id="mkomm" name="kommentar" maxlength="400" rows="3">' + esc(v.coach_comment || '') + '</textarea></div>';
  } else if (v.coach_comment) {
    html += '<p class="trenerkommentar"><strong>Trener:</strong> ' + esc(v.coach_comment) + '</p>';
  }
  html += '</section>' + skjemafeil() + '<button class="knapp" type="submit">Lagre målet</button></form>';
  if (m && (trener || aapen)) {
    html += '<button type="button" class="lenkeknapp" data-handling="slett-mal" data-id="' + esc(m.id) + '">Slett målet</button>';
  }
  return html + '<a class="lenkeknapp" href="' + esc(tilbake) + '">Avbryt</a>';
}

/* ---------- Trener: økt og spiller ---------- */

function spillereMedSamtykke() {
  const t = S.trener;
  return t.spillere.filter((s) => s.active && t.samtykker.some((c) => c.player_id === s.id && !c.withdrawn_at));
}

function loggOppsummering(logger) {
  if (!logger.length) return 'Ingen har logget';
  const smerter = logger.filter((l) => l.pain !== 'nei').length;
  return 'snitt ' + desimal(snitt(logger.map((l) => l.rpe))) + (smerter ? ' · ' + smerter + ' med smerter' : '');
}

function loggKort(l, tittel) {
  return '<div class="kort logg">'
    + '<div class="kort-topp"><h3>' + esc(tittel) + '</h3><span class="merkelapp rpe-merke">' + l.rpe + ' av 10</span></div>'
    + '<p class="dempet liten">' + l.minutes + ' min · belastning ' + belastning(l)
    + (l.pain !== 'nei' ? ' · <span class="smerte">' + esc(SMERTE_NAVN[l.pain]) + ' smerter' + (l.pain_where ? ': ' + esc(l.pain_where) : '') + '</span>' : '') + '</p>'
    + ([l.good_1, l.good_2, l.good_3].some(Boolean)
      ? '<p class="liten"><strong>Bra</strong></p><ul class="punkter">' + [l.good_1, l.good_2, l.good_3].filter(Boolean).map((g) => '<li>' + esc(g) + '</li>').join('') + '</ul>'
      : '')
    + (l.improve ? '<p class="liten"><strong>Bli bedre på:</strong> ' + esc(l.improve) + '</p>' : '')
    + '</div>';
}

function visOkt() {
  const t = S.trener;
  const h = S.hendelser.find((x) => x.id === ruteParam('id'));
  let html = '<div class="overskrift"><p class="overlinje">Logg fra økta</p>'
    + '<h1>' + (h ? esc(dagInfo(h.starts_at).lang) : 'Fant ikke økta') + '</h1>'
    + (h ? '<p class="dempet">' + esc(h.title + ' · ' + tidTekst(h)) + '</p>' : '') + '</div>';
  if (!h || !t) return html + '<a class="knapp sekundar" href="#/trener">Tilbake</a>';
  const logger = t.logger.filter((l) => l.event_id === h.id)
    .sort((a, b) => spillerNavn(a.player_id).localeCompare(spillerNavn(b.player_id), 'nb'));
  const medSamtykke = spillereMedSamtykke();
  const ikke = medSamtykke.filter((s) => !logger.some((l) => l.player_id === s.id));
  const smerter = logger.filter((l) => l.pain !== 'nei');
  html += '<section class="tall-rad">'
    + '<div><b>' + logger.length + '</b><span>av ' + medSamtykke.length + ' har logget</span></div>'
    + '<div><b>' + (logger.length ? desimal(snitt(logger.map((l) => l.rpe))) : '–') + '</b><span>snitt belastning</span></div>'
    + '<div><b>' + smerter.length + '</b><span>med smerter</span></div></section>';
  if (smerter.length) {
    html += '<section class="kort varselkort"><p class="overlinje">Smerter</p><ul class="punkter">'
      + smerter.map((l) => '<li><strong>' + esc(spillerNavn(l.player_id)) + '</strong>: ' + esc(SMERTE_NAVN[l.pain].toLowerCase())
        + (l.pain_where ? ', ' + esc(l.pain_where) : '') + '</li>').join('') + '</ul></section>';
  }
  html += logger.length
    ? '<section class="uke"><h2>Loggene</h2>' + logger.map((l) => loggKort(l, spillerNavn(l.player_id))).join('') + '</section>'
    : '<section class="kort tomt"><p class="dempet">Ingen har logget denne økta ennå.</p></section>';
  if (ikke.length) {
    html += '<section class="kort"><p class="overlinje">Ikke logget</p><p>' + ikke.map((s) => esc(s.full_name)).join(', ') + '</p></section>';
  }
  return html + '<a class="knapp sekundar" href="#/trener">Tilbake til trenersiden</a>';
}

function visSpiller() {
  const t = S.trener;
  const id = ruteParam('id');
  const s = t && t.spillere.find((x) => x.id === id);
  if (!s) return '<div class="overskrift"><h1>Fant ikke spilleren</h1></div><a class="knapp sekundar" href="#/trener">Tilbake</a>';
  const harKonto = t.profiler.some((p) => p.role === 'spiller' && p.player_id === s.id);
  const samtykke = t.samtykker.some((c) => c.player_id === s.id && !c.withdrawn_at);
  const sone = t.soner.find((z) => z.player_id === s.id);
  const sk = sone && SONE[sone.sone];
  let html = '<div class="overskrift"><p class="overlinje">' + esc(POSISJON_NAVN[s.position] || 'Spiller') + '</p><h1>' + esc(s.full_name) + '</h1></div>'
    + '<div class="merker">'
    + '<span class="merkelapp' + (harKonto ? ' sone-gronn' : '') + '">' + (harKonto ? 'Har konto' : 'Ingen konto') + '</span>'
    + '<span class="merkelapp' + (samtykke ? ' sone-gronn' : '') + '">' + (samtykke ? 'Samtykke' : 'Uten samtykke') + '</span>'
    + (sk && sone.sone !== 'mangler' ? '<span class="merkelapp ' + sk.klasse + '">Vekst: ' + esc(sk.navn) + '</span>' : '')
    + '</div>';

  /* Mål */
  const mal = t.mal.filter((m) => m.player_id === s.id);
  const apne = apnePerioder();
  const startFor = (pid) => (S.perioder.find((p) => p.id === pid) || {}).start_date || '';
  const tidligere = [...new Set(mal.map((m) => m.period_id))]
    .filter((pid) => !apne.some((p) => p.id === pid))
    .sort((a, b) => startFor(b).localeCompare(startFor(a)));
  const perioder = apne.map((p) => p.id).concat(tidligere);
  html += '<section class="uke"><h2>Utviklingsmål</h2>';
  for (const pid of perioder) {
    const egne = mal.filter((m) => m.period_id === pid);
    const aapen = apne.some((p) => p.id === pid);
    const snart = aapen && (datoFraStr(startFor(pid)) - datoFraStr(idagStr())) / DAG_MS <= 10;
    if (!egne.length && !((apne[0] && pid === apne[0].id) || snart)) continue;
    html += '<div class="kort"><p class="overlinje">' + esc(periodeTittel(pid)) + '</p>'
      + (egne.length ? egne.map((m) => malBlokk(m, '#/mal?id=' + encodeURIComponent(m.id), true)).join('') : '<p class="dempet">Ingen mål ennå.</p>')
      + (aapen && egne.length < 3 ? '<a class="knapp sekundar liten-knapp" href="#/mal?spiller=' + esc(encodeURIComponent(s.id)) + '&periode=' + esc(encodeURIComponent(pid)) + '">Nytt mål</a>' : '')
      + '</div>';
  }
  html += '</section>';

  /* Belastning per uke, økt-RPE ganger minutter */
  const logger = t.logger.filter((l) => l.player_id === s.id)
    .map((l) => ({ l, h: S.hendelser.find((x) => x.id === l.event_id) }))
    .filter((x) => x.h)
    .sort((a, b) => new Date(b.h.starts_at) - new Date(a.h.starts_at));
  html += '<section class="uke"><h2>Belastning</h2>';
  if (!logger.length) {
    html += '<section class="kort tomt"><p class="dempet">Ingen logger ennå.</p></section>';
  } else {
    const uker = [];
    for (const x of logger) {
      const m = mandagFor(new Date(x.h.starts_at)).getTime();
      let u = uker.find((y) => y.m === m);
      if (!u) {
        u = { m, sum: 0, okter: 0, rpe: [] };
        uker.push(u);
      }
      u.sum += belastning(x.l);
      u.okter += 1;
      u.rpe.push(x.l.rpe);
    }
    html += '<div class="liste">' + uker.slice(0, 6).map((u) => '<div class="rad"><div class="rad-tekst">'
      + '<span class="navn">Uke ' + isoUke(new Date(u.m)) + '</span>'
      + '<span class="under">' + u.okter + (u.okter === 1 ? ' økt' : ' økter') + ' · snitt ' + desimal(snitt(u.rpe)) + '</span></div>'
      + '<span class="tall">' + u.sum + '</span></div>').join('') + '</div>'
      + '<p class="dempet liten">Belastning = hvor hard økta var (1–10) × minutter, lagt sammen per uke.</p>';
  }
  html += '</section>';

  if (logger.length) {
    html += '<section class="uke"><h2>Siste logger</h2>'
      + logger.slice(0, 8).map((x) => loggKort(x.l, dagInfo(x.h.starts_at).lang)).join('') + '</section>';
  }

  /* Spillerens egen kalender sammen med lagets økter */
  const kal = (t.kalender || []).filter((o) => o.player_id === s.id);
  const mandag = ukeFraParam();
  html += '<section class="uke"><h2>Ukeplan</h2>'
    + (kal.length ? '' : '<p class="dempet liten">' + esc(s.full_name.split(' ')[0]) + ' har ikke lagt inn noe i Min kalender ennå.</p>')
    + '<a class="knapp sekundar liten-knapp" href="#/oppforing?spiller=' + esc(encodeURIComponent(s.id)) + '">Legg til i kalenderen</a>'
    + ukeNavigasjon(mandag, '#/spiller?id=' + encodeURIComponent(s.id) + '&uke=')
    + ukeplan(mandag, kal, true) + '</section>';

  if (sone && sone.sist_malt) {
    html += '<section class="kort"><p class="overlinje">Høyde</p><p><strong>' + esc(cm(sone.hoyde_cm)) + ' cm</strong> · målt ' + esc(datoUtenAar(sone.sist_malt)) + '</p>'
      + (sone.vekst_siste_mnd != null ? '<p class="dempet liten">' + esc(medFortegn(sone.vekst_siste_mnd)) + ' cm siste måned</p>' : '') + '</section>';
  }
  return html + '<a class="knapp sekundar" href="#/trener">Tilbake til trenersiden</a>';
}

/* ---------- Trener ---------- */

function spillerNavn(id) {
  const s = S.trener && S.trener.spillere.find((x) => x.id === id);
  return s ? s.full_name : 'Ukjent spiller';
}

function profilNavn(id) {
  const p = S.trener && S.trener.profiler.find((x) => x.id === id);
  return p ? p.full_name : 'Ukjent bruker';
}

function kodeGjelder(k) {
  if (k.purpose === 'nytt_passord') return 'Nytt passord: ' + profilNavn(k.user_id);
  if (k.role === 'spiller') return 'Spiller: ' + spillerNavn(k.player_id);
  if (k.role === 'forelder') return 'Forelder: ' + (k.full_name || '') + ' (til ' + spillerNavn(k.player_id) + ')';
  return 'Trener: ' + (k.full_name || '');
}

function visTrener() {
  const t = S.trener;
  let html = '<div class="overskrift"><p class="overlinje">Bare for trenere</p><h1>Trener</h1></div>';
  if (!t) return html + '<section class="kort tomt"><p>Laster …</p></section>';

  if (UI.kodeResultat) {
    html += '<section class="kort"><p class="overlinje">Ny kode</p>'
      + '<p class="kode">' + esc(visKode(UI.kodeResultat.kode)) + '</p>'
      + '<p class="dempet liten">' + esc(UI.kodeResultat.gjelder) + '. Gjelder i 14 dager.</p>'
      + '<div class="felt"><label for="kodetekst">Melding du kan sende i Hoopit eller på SMS</label><textarea id="kodetekst" readonly>' + esc(UI.kodeResultat.tekst) + '</textarea></div>'
      + '<button type="button" class="knapp" data-handling="kopier" data-kilde="kodetekst">Kopier meldingen</button>'
      + '<button type="button" class="lenkeknapp" data-handling="lukk-kode">Ferdig</button></section>';
  }

  html += samtaleTrenerKort();
  html += kalenderVerktoy(true);

  html += '<section class="kort"><h2>Se siden som spiller eller forelder</h2>'
    + '<p class="dempet liten">Du ser nøyaktig det de ser, med en oppdiktet spiller. Det du gjør der, blir ikke lagret.</p>'
    + '<div class="to-kol">'
    + '<button type="button" class="knapp sekundar" data-handling="vis-som" data-rolle="spiller">Spiller</button>'
    + '<button type="button" class="knapp sekundar" data-handling="vis-som" data-rolle="forelder">Forelder</button>'
    + '</div></section>';

  const spillerProfiler = t.profiler.filter((p) => p.role === 'spiller');
  const harKonto = new Set(spillerProfiler.map((p) => p.player_id));
  const aktiveSpillere = t.spillere.filter((s) => s.active);

  html += '<section class="kort"><h2>Ny konto</h2>'
    + '<p class="dempet liten">Lag en kode og send den til personen. Koden gjelder i 14 dager. Spiller: velg spilleren. Forelder: velg barnet og skriv forelderens navn. Trener: skriv navnet.</p>'
    + '<form class="skjema" data-skjema="ny-kode" novalidate>'
    + '<div class="felt"><label for="krolle">Rolle</label><select id="krolle" name="rolle">'
    + '<option value="spiller">Spiller</option><option value="forelder">Forelder</option><option value="trener">Trener</option></select></div>'
    + '<div class="felt"><label for="kspiller">Spiller</label><select id="kspiller" name="spiller"><option value="">Velg spiller</option>'
    + aktiveSpillere.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.full_name) + (harKonto.has(s.id) ? ' (har konto)' : '') + '</option>').join('')
    + '</select></div>'
    + '<div class="felt"><label for="knavn">Navn på forelder eller trener</label><input id="knavn" name="navn" autocomplete="off"></div>'
    + skjemafeil()
    + '<button class="knapp" type="submit">Lag kode</button></form></section>';

  html += '<section class="kort"><h2>Nytt passord</h2><p class="dempet liten">Lag en kode til noen som har glemt passordet.</p>'
    + '<form class="skjema" data-skjema="passord-kode" novalidate>'
    + '<div class="felt"><label for="kbruker">Hvem</label><select id="kbruker" name="bruker"><option value="">Velg person</option>'
    + t.profiler.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.full_name) + ' (' + esc((ROLLE_NAVN[p.role] || p.role).toLowerCase()) + ')</option>').join('')
    + '</select></div>' + skjemafeil()
    + '<button class="knapp sekundar" type="submit">Lag kode</button></form></section>';

  /* Logg fra økter de siste 14 dagene */
  const naa = Date.now();
  const nyligeOkter = S.hendelser
    .filter((h) => LOGG_TYPER.includes(h.kind) && h.status !== 'avlyst' && new Date(h.starts_at).getTime() <= naa
      && sluttTid(h).getTime() >= naa - 14 * DAG_MS)
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
  const antallMedSamtykke = spillereMedSamtykke().length;
  html += '<section class="uke"><h2>Logg fra økter</h2>';
  html += nyligeOkter.length
    ? '<div class="liste">' + nyligeOkter.map((h) => {
      const d = dagInfo(h.starts_at);
      const logger = t.logger.filter((l) => l.event_id === h.id);
      return '<a class="rad lenkerad" href="#/okt?id=' + esc(encodeURIComponent(h.id)) + '">'
        + '<div class="dato-blokk"><span class="dag">' + esc(d.kort) + '</span><span class="dato">' + esc(d.dato) + '</span></div>'
        + '<div class="rad-tekst"><span class="navn">' + logger.length + ' av ' + antallMedSamtykke + ' har logget</span>'
        + '<span class="under">' + esc(loggOppsummering(logger)) + '</span></div><span class="pil" aria-hidden="true">›</span></a>';
    }).join('') + '</div>'
    : '<section class="kort tomt"><p class="dempet">Etter første økt ser du loggene til spillerne her: belastning, smerter og tilbakemeldinger.</p></section>';
  html += '</section>';

  /* Kroppsøving, annen trening og kamper i spillernes kalender i dag */
  const kalender = t.kalender || [];
  const idag = idagStr();
  const idagNr = datoFraStr(idag).getUTCDay() || 7;
  const iDag = kalender
    .filter((o) => BELASTNING_KAT.includes(o.category) && ((o.weekdays && o.weekdays.includes(idagNr)) || o.on_date === idag))
    .sort((a, b) => tidKort(a.starts).localeCompare(tidKort(b.starts)));
  html += '<section class="uke"><h2>Annen belastning i dag</h2>'
    + '<a class="knapp sekundar liten-knapp" href="#/oppforing">Legg inn trening for spillere</a>';
  html += iDag.length
    ? '<div class="liste">' + iDag.map((o) => {
      const kat = KAL_KATEGORI[o.category];
      return '<a class="rad lenkerad" href="#/spiller?id=' + esc(encodeURIComponent(o.player_id)) + '"><div class="rad-tekst">'
        + '<span class="navn">' + esc(spillerNavn(o.player_id)) + '</span>'
        + '<span class="under">' + esc(kat.navn + (o.title ? ': ' + o.title : '') + ' · ' + tidKort(o.starts) + (o.ends ? '–' + tidKort(o.ends) : '')) + '</span>'
        + '</div><span class="pil" aria-hidden="true">›</span></a>';
    }).join('') + '</div>'
    : '<section class="kort tomt"><p class="dempet">Ingen har kroppsøving, annen trening eller kamp i kalenderen i dag.</p></section>';
  html += '</section>';

  const soner = new Map(t.soner.map((s) => [s.player_id, s]));
  html += '<section class="uke"><h2>Spillere</h2><p class="dempet liten">Trykk på en spiller for mål, ukeplan, logger og belastning.</p><div class="liste">'
    + aktiveSpillere.map((s) => {
      const foreldre = t.lenker.filter((l) => l.player_id === s.id).length;
      const samtykke = t.samtykker.some((c) => c.player_id === s.id && !c.withdrawn_at);
      const sone = soner.get(s.id);
      const sk = sone && SONE[sone.sone];
      const antallMal = t.mal.filter((m) => m.player_id === s.id && apnePerioder().some((p) => p.id === m.period_id)).length;
      return '<a class="rad spillerrad lenkerad" href="#/spiller?id=' + esc(encodeURIComponent(s.id)) + '"><div class="rad-tekst"><span class="navn">' + esc(s.full_name) + '</span>'
        + '<span class="under">' + esc(POSISJON_NAVN[s.position] || '') + ' · ' + (harKonto.has(s.id) ? 'har konto' : 'ingen konto')
        + ' · ' + foreldre + (foreldre === 1 ? ' forelder' : ' foreldre')
        + (antallMal ? ' · ' + antallMal + (antallMal === 1 ? ' mål' : ' mål') : '') + '</span></div>'
        + '<div class="merker">' + (samtykke ? '<span class="merkelapp sone-gronn">Samtykke</span>' : '<span class="merkelapp">Uten samtykke</span>')
        + (sk && sone.sone !== 'mangler' ? '<span class="merkelapp ' + sk.klasse + '">' + esc(sk.navn) + '</span>' : '') + '</div></a>';
    }).join('')
    + '</div></section>';

  const malte = t.soner.filter((s) => s.sist_malt);
  html += '<section class="uke"><h2>Vekstsoner</h2>';
  if (!malte.length) {
    html += '<section class="kort tomt"><p>Ingen høydemålinger ennå. Sonene vises når spillerne har lagt inn høyden minst to ganger.</p></section>';
  } else {
    const sortert = malte.slice().sort((a, b) => (SONE_REKKEFOLGE[a.sone] - SONE_REKKEFOLGE[b.sone]) || a.full_name.localeCompare(b.full_name, 'nb'));
    html += '<div class="liste">' + sortert.map((s) => {
      const sk = SONE[s.sone] || SONE.mangler;
      const deler = ['Sist målt ' + datoUtenAar(s.sist_malt)];
      if (s.vekst_siste_mnd != null) deler.push(medFortegn(s.vekst_siste_mnd) + ' cm siste mnd');
      if (s.snitt_per_mnd_3 != null) deler.push(medFortegn(s.snitt_per_mnd_3) + ' cm/mnd snitt 3 mnd');
      return '<div class="rad spillerrad"><div class="rad-tekst"><span class="navn">' + esc(s.full_name) + '</span>'
        + '<span class="under">' + esc(deler.join(' · ')) + '</span></div>'
        + '<div class="merker"><span class="merkelapp ' + sk.klasse + '">' + esc(sk.navn) + '</span>'
        + (s.maling_forfalt ? '<span class="merkelapp planlagt">Måling forfalt</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  html += '<div class="kort"><p class="overlinje">Tiltak fra skaderisikoplanen</p><div class="sone-forklaring">'
    + ['rød', 'gul', 'grønn'].map((n) => '<div><span class="merkelapp ' + SONE[n].klasse + '">' + SONE[n].navn + '</span><span>' + esc(SONE[n].tiltak) + '</span></div>').join('')
    + '</div><p class="dempet liten">Rød: over 1,0 cm siste måned eller over 0,6 cm per måned i snitt siste tre måneder. Gul: akkurat på en av grensene. Under tre måneders historikk brukes bare siste måned. Vurder alltid smerter, funksjon og totalbelastning.</p></div></section>';

  const aktiveKoder = t.koder.filter((k) => !k.used_at && new Date(k.expires_at).getTime() > naa);
  html += '<section class="uke"><h2>Aktive koder</h2>';
  html += aktiveKoder.length
    ? '<div class="liste">' + aktiveKoder.map((k) => '<div class="rad"><div class="rad-tekst"><span class="navn">' + esc(visKode(k.code)) + '</span>'
      + '<span class="under">' + esc(kodeGjelder(k)) + ' · gjelder til ' + esc(datoUtenAar(osloDatoStr(new Date(k.expires_at)))) + '</span></div>'
      + '<button type="button" class="lenkeknapp" data-handling="slett-kode" data-kode="' + esc(k.code) + '">Slett</button></div>').join('') + '</div>'
    : '<section class="kort tomt"><p class="dempet">Ingen ubrukte koder.</p></section>';
  html += '</section>';
  return html;
}

/* ---------- Forhåndsvisning for trenere ---------- */

/*
 * Trenerne kan se siden slik en spiller eller en forelder ser den. Visningen bruker en
 * oppdiktet spiller og lagrer ingenting: alt skjer i nettleseren og forsvinner når treneren
 * avslutter eller laster siden på nytt. Felles innhold (kalender, spillmodell, plan) er det
 * ekte, og sider som bare er for trenere, tas bort slik databasen gjør for spillere og foreldre.
 */
const DEMO_SPILLER = { id: 'demo-spiller', full_name: 'Ola Nordmann', position: 'midtbane' };

function demoHoyder() {
  /* Siste måling litt over en måned tilbake, så påminnelsen vises slik gutta får den. */
  return [[34, 171.6], [65, 170.9], [96, 170.4], [127, 169.8]].map(([dager, hoyde], i) => {
    const tid = new Date(Date.now() - dager * DAG_MS);
    return { id: 'demo-' + i, measured_on: osloDatoStr(tid), height_cm: hoyde, created_at: tid.toISOString() };
  });
}

/* En oppdiktet økt fra den siste tirsdagen, onsdagen eller fredagen, så logg-kortet vises. */
function demoOkt() {
  let start = null;
  for (let d = 1; d <= 7 && !start; d++) {
    const dag = new Date(Date.now() - d * DAG_MS);
    if ([2, 3, 5].includes(dag.getUTCDay())) start = dag;
  }
  start.setUTCHours(15, 45, 0, 0);
  return {
    id: 'demo-okt', kind: 'trening', title: 'Fellestrening (eksempel)',
    starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 75 * 60000).toISOString(),
    meet_at: new Date(start.getTime() - 15 * 60000).toISOString(), location: 'Sofiemyr kunstgress',
    theme: null, why: null, details: null, opponent: null, period_id: null, status: 'bekreftet'
  };
}

function demoMal() {
  const p = apnePerioder()[0];
  if (!p) return [];
  const felles = { player_id: DEMO_SPILLER.id, period_id: p.id, status: 'aktiv', reflection: null, created_at: new Date().toISOString() };
  return [
    Object.assign({ id: 'demo-mal-1', goal: 'Bruke svak fot i pasningsøvelser og småbanespill',
      how: '20 pasninger med venstre hver økt og 10 minutter egentrening to ganger i uka',
      coach_comment: 'Godt mål. Vi ser etter det i dobbelrondoen på tirsdager.' }, felles),
    Object.assign({ id: 'demo-mal-2', goal: 'Scanne før jeg får ballen',
      how: 'Se over skulderen to ganger før ballen kommer, særlig i possession', coach_comment: null }, felles)
  ];
}

function demoKalender() {
  const felles = { player_id: DEMO_SPILLER.id, on_date: null, note: null, title: null, ends: null };
  return [
    Object.assign({}, felles, { id: 'demo-kal-1', category: 'skole', weekdays: [1, 2, 3, 4, 5], starts: '08:30:00', ends: '15:00:00' }),
    Object.assign({}, felles, { id: 'demo-kal-2', category: 'kroppsoving', weekdays: [2], starts: '10:00:00', ends: '11:30:00' }),
    Object.assign({}, felles, { id: 'demo-kal-3', category: 'trening', title: 'JR1-trening', weekdays: [4], starts: '18:00:00', ends: '19:30:00', created_by: 'demo-trener' }),
    Object.assign({}, felles, { id: 'demo-kal-4', category: 'mat', title: 'Middag', weekdays: [1, 2, 3, 4, 5], starts: '15:30:00' }),
    Object.assign({}, felles, { id: 'demo-kal-5', category: 'sovn', title: 'Legger meg', weekdays: [1, 2, 3, 4, 5, 6, 7], starts: '22:30:00', ends: '07:00:00' })
  ];
}

function visningsBanner() {
  if (!UI.visSom) return '';
  return '<div class="visning" role="status"><p><strong>Du ser siden som ' + (UI.visSom === 'spiller' ? 'spiller' : 'forelder') + '</strong>'
    + 'Oppdiktet spiller. Ingenting lagres.</p>'
    + '<button type="button" data-handling="avslutt-visning">Avslutt</button></div>';
}

function startVisning(rolle) {
  if (!S.profil || S.profil.role !== 'trener' || UI.visSom) return;
  if (rolle !== 'spiller' && rolle !== 'forelder') return;
  UI.ekte = {
    profil: S.profil, sider: S.sider, spiller: S.spiller, samtykker: S.samtykker, hoyder: S.hoyder,
    barn: S.barn, hendelser: S.hendelser, logger: S.logger, mal: S.mal, kalender: S.kalender,
    samtaleTider: S.samtaleTider, samtaleSvar: S.samtaleSvar
  };
  UI.visSom = rolle;
  UI.kodeResultat = null;
  S.sider = Object.fromEntries(Object.entries(S.sider).filter(([, side]) => side.audience === 'alle'));
  /* Samtaletidene slik spillerne ser dem: ledig eller opptatt, uten navn. */
  S.samtaleTider = ((S.trener && S.trener.samtaleTider) || []).map((t) => ({
    id: t.id, samtale_id: t.samtale_id, starts_at: t.starts_at, ends_at: t.ends_at, ledig: !t.player_id, min: false
  }));
  S.samtaleSvar = [];
  if (rolle === 'spiller') {
    S.profil = { id: 'demo-profil', username: 'ola.n', full_name: DEMO_SPILLER.full_name, role: 'spiller', player_id: DEMO_SPILLER.id };
    S.spiller = DEMO_SPILLER;
    S.samtykker = [{ player_id: DEMO_SPILLER.id, version: KONFIG.samtykkeVersjon, accepted_at: new Date().toISOString(), withdrawn_at: null }];
    S.hoyder = demoHoyder();
    if (!S.hendelser.some(kanLogges)) {
      S.hendelser = S.hendelser.concat([demoOkt()]).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    }
    S.logger = [];
    S.mal = demoMal();
    S.kalender = demoKalender();
    S.barn = [];
  } else {
    S.profil = { id: 'demo-profil', username: 'kari.n', full_name: 'Kari Nordmann', role: 'forelder', player_id: null };
    S.spiller = null;
    S.samtykker = [];
    S.hoyder = [];
    S.logger = [];
    S.mal = [];
    S.kalender = [];
    S.barn = [DEMO_SPILLER];
  }
  gaTil(rolle === 'forelder' ? 'meg' : 'hjem');
}

function avsluttVisning() {
  if (!UI.visSom) return;
  Object.assign(S, UI.ekte);
  UI.ekte = null;
  UI.visSom = null;
  gaTil('trener');
}

/* ---------- Handlinger ---------- */

function gaTil(rute) {
  const maal = '#/' + rute;
  if (location.hash !== maal) location.hash = maal;
  else tegn();
}

const SKJEMA = {
  async 'logg-inn'(d) {
    const brukernavn = normalisertBrukernavn(d.brukernavn);
    if (!brukernavn || !d.passord) throw new Error('Skriv brukernavn og passord.');
    await api.loggInn(brukernavn, d.passord);
    await lastAlt();
    UI.melding = '';
    /* Kom han fra en lenke til en bestemt side (f.eks. #/samtale fra Hoopit), går han dit. */
    const rute = gjeldendeRute();
    gaTil(rute && SIDER[rute] ? location.hash.replace(/^#\/?/, '') : 'hjem');
  },

  async 'forste-gang'(d) {
    const kode = normalisertKode(d.kode);
    const brukernavn = normalisertBrukernavn(d.brukernavn);
    if (kode.length !== 10) throw new Error('Koden skal ha 10 tegn.');
    if (!BRUKERNAVN_RE.test(brukernavn)) throw new Error('Brukernavnet må ha 3–30 tegn: små bokstaver, tall, punktum, bindestrek eller understrek.');
    sjekkPassord(d.passord, d.passord2);
    await api.funksjon('konto', { handling: 'registrer', kode, brukernavn, passord: d.passord });
    await api.loggInn(brukernavn, d.passord);
    await lastAlt();
    UI.melding = 'Velkommen! Kontoen din er klar.';
    gaTil(S.profil && S.profil.role === 'forelder' ? 'meg' : 'hjem');
  },

  async 'nytt-passord'(d) {
    const kode = normalisertKode(d.kode);
    if (kode.length !== 10) throw new Error('Koden skal ha 10 tegn.');
    sjekkPassord(d.passord, d.passord2);
    const svar = await api.funksjon('konto', { handling: 'nytt_passord', kode, passord: d.passord });
    if (svar.brukernavn) {
      await api.loggInn(svar.brukernavn, d.passord);
      await lastAlt();
      UI.melding = 'Passordet er byttet. Brukernavnet ditt er ' + svar.brukernavn + '.';
      gaTil('hjem');
    } else {
      UI.melding = 'Passordet er byttet. Logg inn med det nye passordet.';
      gaTil('');
    }
  },

  async 'hoyde'(d) {
    const hoyde = tallFraTekst(d.cm);
    if (!(hoyde >= 120 && hoyde <= 230)) throw new Error('Skriv høyden i centimeter, for eksempel 176,5.');
    const dato = d.dato || idagStr();
    if (dato > idagStr()) throw new Error('Datoen kan ikke være fram i tid.');
    if (UI.visSom) {
      const ny = { id: 'demo-' + Date.now(), measured_on: dato, height_cm: Math.round(hoyde * 10) / 10, created_at: new Date().toISOString() };
      S.hoyder = [ny].concat(S.hoyder.filter((h) => h.measured_on !== dato)).sort((a, b) => b.measured_on.localeCompare(a.measured_on));
      UI.melding = 'Forhåndsvisning: høyden er ikke lagret.';
      tegn();
      return;
    }
    await api.rest('heights?on_conflict=player_id,measured_on', {
      metode: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      kropp: { player_id: S.profil.player_id, measured_on: dato, height_cm: Math.round(hoyde * 10) / 10 }
    });
    await lastSpiller();
    UI.melding = 'Høyden er lagret.';
    tegn();
  },

  async 'logg'(d) {
    const h = S.hendelser.find((x) => x.id === d.okt);
    if (!h) throw new Error('Fant ikke økta.');
    const rpe = Number(d.rpe);
    if (!(rpe >= 1 && rpe <= 10)) throw new Error('Velg hvor hard økta var, fra 1 til 10.');
    const minutter = heltall(d.minutter);
    if (!(minutter >= 1 && minutter <= 240)) throw new Error('Skriv hvor mange minutter du var med, for eksempel 75.');
    const bra = [d.bra1, d.bra2, d.bra3].map(tekstFelt);
    if (bra.some((s) => !s || s.length < 2)) throw new Error('Skriv tre ting som var bra.');
    const bedre = tekstFelt(d.bedre);
    if (!bedre || bedre.length < 2) throw new Error('Skriv én ting du vil bli bedre på.');
    const smerte = SMERTE_NAVN[d.smerte] ? d.smerte : 'nei';
    const kropp = {
      player_id: S.profil.player_id,
      event_id: h.id,
      rpe,
      minutes: minutter,
      pain: smerte,
      pain_where: smerte === 'nei' ? null : tekstFelt(d.hvor),
      good_1: bra[0],
      good_2: bra[1],
      good_3: bra[2],
      improve: bedre
    };
    const takk = smerte === 'mye' ? 'Takk! Økta er logget. Si fra til treneren om smertene.' : 'Takk! Økta er logget.';
    if (UI.visSom) {
      const gammel = loggFor(h.id);
      S.logger = [Object.assign({ id: 'demo-logg-' + h.id, created_at: new Date().toISOString() }, gammel || {}, kropp)]
        .concat(S.logger.filter((l) => l.event_id !== h.id));
      UI.melding = 'Forhåndsvisning: loggen er ikke lagret.';
      gaTil('uke');
      return;
    }
    await api.rest('session_logs?on_conflict=player_id,event_id', {
      metode: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      kropp
    });
    await lastSpiller();
    UI.melding = takk;
    gaTil('uke');
  },

  async 'mal'(d) {
    const trener = S.profil.role === 'trener';
    const mal = tekstFelt(d.mal);
    if (!mal || mal.length < 3) throw new Error('Skriv målet med noen få ord.');
    const kropp = { goal: mal, how: tekstFelt(d.hvordan) };
    if (d.id) {
      if (MAL_STATUS[d.status]) kropp.status = d.status;
      kropp.reflection = tekstFelt(d.refleksjon);
    } else {
      kropp.period_id = d.periode;
      if (trener) kropp.player_id = d.spiller;
    }
    if (trener) kropp.coach_comment = tekstFelt(d.kommentar);
    if (UI.visSom) {
      if (d.id) {
        S.mal = S.mal.map((m) => (m.id === d.id ? Object.assign({}, m, kropp) : m));
      } else {
        if (S.mal.filter((m) => m.period_id === d.periode).length >= 3) throw new Error('Du kan ha maks tre mål per periode.');
        S.mal = S.mal.concat([Object.assign({ id: 'demo-mal-' + Date.now(), player_id: S.profil.player_id, status: 'aktiv', reflection: null, coach_comment: null, created_at: new Date().toISOString() }, kropp)]);
      }
      UI.melding = 'Forhåndsvisning: målet er ikke lagret.';
      gaTil('meg');
      return;
    }
    if (d.id) {
      const rader = await api.rest('goals?id=eq.' + encodeURIComponent(d.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp });
      if (!rader || !rader.length) throw new Error('Målet kan ikke endres lenger.');
    } else {
      await api.rest('goals', { metode: 'POST', prefer: 'return=minimal', kropp });
    }
    UI.melding = 'Målet er lagret.';
    if (trener) {
      await lastTrener();
      gaTil('spiller?id=' + encodeURIComponent(d.spiller));
    } else {
      await lastSpiller();
      gaTil('meg');
    }
  },

  async 'oppforing'(d) {
    const valgte = Object.keys(d).filter((k) => k.startsWith('sp-') && d[k]).map((k) => k.slice(3));
    if (S.profil.role === 'trener' && !d.id && !valgte.length) throw new Error('Velg minst én spiller.');
    if (!KAL_KATEGORI[d.kat]) throw new Error('Velg hva det gjelder.');
    const dager = [1, 2, 3, 4, 5, 6, 7].filter((i) => d['dag' + i]);
    const dato = tekstFelt(d.dato);
    if (!dager.length && !dato) throw new Error('Velg hvilke dager det gjelder hver uke, eller én bestemt dag.');
    if (dager.length && dato) throw new Error('Velg enten faste dager eller én bestemt dag, ikke begge.');
    if (dato && !/^\d{4}-\d{2}-\d{2}$/.test(dato)) throw new Error('Datoen er ikke gyldig.');
    const tidRe = /^\d{2}:\d{2}(:\d{2})?$/;
    const fra = tekstFelt(d.fra);
    if (!fra || !tidRe.test(fra)) throw new Error('Skriv når det starter.');
    const til = tekstFelt(d.til);
    if (til && !tidRe.test(til)) throw new Error('Sluttiden er ikke gyldig.');
    const kropp = {
      category: d.kat,
      title: tekstFelt(d.navn),
      weekdays: dager.length ? dager : null,
      on_date: dager.length ? null : dato,
      starts: fra.slice(0, 5),
      ends: til ? til.slice(0, 5) : null,
      note: tekstFelt(d.notat)
    };
    const ukeParam = dato ? '&uke=' + mandagFor(datoFraStr(dato)).toISOString().slice(0, 10) : '';
    if (S.profil.role === 'trener') {
      if (d.id) {
        const rader = await api.rest('personal_entries?id=eq.' + encodeURIComponent(d.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp });
        if (!rader || !rader.length) throw new Error('Kunne ikke endre dette. Last siden på nytt og prøv igjen.');
        await lastTrener();
        UI.melding = 'Lagret i kalenderen til ' + spillerNavn(d.spiller) + '.';
        gaTil('spiller?id=' + encodeURIComponent(d.spiller) + ukeParam);
        return;
      }
      const spillere = valgte;
      await api.rest('personal_entries', {
        metode: 'POST',
        prefer: 'return=minimal',
        kropp: spillere.map((pid) => Object.assign({ player_id: pid }, kropp))
      });
      await lastTrener();
      UI.melding = spillere.length === 1
        ? 'Lagt inn i kalenderen til ' + spillerNavn(spillere[0]) + '.'
        : 'Lagt inn i kalenderen til ' + spillere.length + ' spillere.';
      gaTil(spillere.length === 1 ? 'spiller?id=' + encodeURIComponent(spillere[0]) + ukeParam : (d.fra === 'kalender' ? 'kalender' : 'trener'));
      return;
    }
    const tilbake = 'kalender?vis=min' + ukeParam;
    if (UI.visSom) {
      if (d.id) {
        S.kalender = S.kalender.map((o) => (o.id === d.id ? Object.assign({}, o, kropp) : o));
      } else {
        S.kalender = S.kalender.concat([Object.assign({ id: 'demo-kal-' + Date.now(), player_id: S.profil.player_id }, kropp)]);
      }
      UI.melding = 'Forhåndsvisning: kalenderen er ikke lagret.';
      gaTil(tilbake);
      return;
    }
    if (d.id) {
      const rader = await api.rest('personal_entries?id=eq.' + encodeURIComponent(d.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp });
      if (!rader || !rader.length) throw new Error('Kunne ikke endre dette. Last siden på nytt og prøv igjen.');
    } else {
      kropp.player_id = S.profil.player_id;
      await api.rest('personal_entries', { metode: 'POST', prefer: 'return=minimal', kropp });
    }
    await lastSpiller();
    UI.melding = 'Lagret i kalenderen.';
    gaTil(tilbake);
  },

  async 'hendelse'(d) {
    if (!erTrener()) return;
    const type = HENDELSE_TYPE[d.type] ? d.type : '';
    if (!type) throw new Error('Velg hva slags aktivitet det er.');
    const dato = tekstFelt(d.dato);
    if (!dato || !DATO_RE.test(dato)) throw new Error('Velg dato.');
    const start = tidVerdi(d.start, 'Starttiden er ikke gyldig.');
    if (!start) throw new Error('Skriv når den starter.');
    const slutt = tidVerdi(d.slutt, 'Sluttiden er ikke gyldig.');
    const oppmote = tidVerdi(d.oppmote, 'Oppmøtetiden er ikke gyldig.');
    if (slutt && slutt <= start) throw new Error('Slutt må være etter start.');
    if (oppmote && oppmote > start) throw new Error('Oppmøte kan ikke være etter start.');
    let datoer = [dato];
    const gjenta = d.id ? null : tekstFelt(d.gjenta);
    if (gjenta) {
      if (!DATO_RE.test(gjenta)) throw new Error('Datoen under «Gjenta» er ikke gyldig.');
      if (gjenta < dato) throw new Error('«Gjenta til og med» kan ikke være før datoen.');
      datoer = ukentligeDatoer(dato, gjenta);
      if (datoer.length > MAKS_UKER) throw new Error('Du kan legge inn maks ' + MAKS_UKER + ' uker om gangen.');
    }
    const motstander = tekstFelt(d.motstander);
    const felles = {
      kind: type,
      title: tekstFelt(d.navn) || standardTittel(type, motstander),
      location: tekstFelt(d.sted),
      opponent: motstander,
      theme: tekstFelt(d.tema),
      why: tekstFelt(d.hvorfor),
      details: tekstFelt(d.opplegg),
      status: HENDELSE_STATUS[d.status] ? d.status : 'bekreftet'
    };
    const rader = datoer.map((ds) => Object.assign({}, felles, {
      starts_at: osloTidspunkt(ds, start).toISOString(),
      ends_at: slutt ? osloTidspunkt(ds, slutt).toISOString() : null,
      meet_at: oppmote ? osloTidspunkt(ds, oppmote).toISOString() : null,
      period_id: periodeIdFor(S.perioder, ds)
    }));
    if (d.id) {
      const svar = await api.rest('events?id=eq.' + encodeURIComponent(d.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp: rader[0] });
      if (!svar || !svar.length) throw new Error('Fant ikke økta. Last siden på nytt og prøv igjen.');
    } else {
      await api.rest('events', { metode: 'POST', prefer: 'return=minimal', kropp: rader });
    }
    S.hendelser = (await api.rest('events?select=*&order=starts_at.asc')) || [];
    if (rader[0].period_id) UI.periode = rader[0].period_id;
    UI.melding = d.id ? 'Endringene er lagret. Spillerne ser dem nå.'
      : rader.length === 1 ? 'Økta er lagt inn. Spillerne ser den nå.'
        : rader.length + ' økter er lagt inn, ' + dagInfo(rader[0].starts_at).lang.toLowerCase() + ' til ' + dagInfo(rader[rader.length - 1].starts_at).lang.toLowerCase() + '.';
    gaTil('kalender');
  },

  async 'inspirasjon'(d) {
    if (S.profil.role !== 'trener') return;
    const url = tekstFelt(d.url);
    if (!url || !/^https?:\/\/\S+$/i.test(url)) throw new Error('Lim inn en lenke som starter med https://');
    if (url.length > 500) throw new Error('Lenken er for lang.');
    const tittel = tekstFelt(d.tittel);
    if (!tittel || tittel.length < 2) throw new Error('Skriv en kort tittel.');
    await api.rest('inspiration', { metode: 'POST', prefer: 'return=minimal', kropp: { url, title: tittel, note: tekstFelt(d.notat) } });
    S.inspirasjon = (await api.rest('inspiration?select=*&order=created_at.desc&limit=200')) || [];
    UI.melding = 'Delt med laget.';
    tegn();
  },

  async 'trenerkommentar'(d) {
    if (S.profil.role !== 'trener' || !d.id) return;
    await api.rest('goals?id=eq.' + encodeURIComponent(d.id), {
      metode: 'PATCH',
      prefer: 'return=minimal',
      kropp: { coach_comment: tekstFelt(d.kommentar) }
    });
    await lastTrener();
    UI.melding = 'Kommentaren er lagret.';
    tegn();
  },

  async 'samtale-annen'(d) {
    if (!SAMTALE_VALG[d.valg]) throw new Error('Velg hva som passer best.');
    const merknad = tekstFelt(d.merknad);
    if (merknad && merknad.length > 300) throw new Error('Skriv litt kortere (maks 300 tegn).');
    const har = S.samtaleTider.find((x) => x.samtale_id === d.samtale && x.min);
    if (har && !window.confirm('Da gir du fra deg tiden ' + tidTekst(har) + '. Vil du det?')) {
      throw new Error('Svaret er ikke sendt. Du har fortsatt tiden ' + tidTekst(har) + '.');
    }
    if (UI.visSom) {
      S.samtaleTider = S.samtaleTider.map((x) => (x.samtale_id === d.samtale && x.min ? Object.assign({}, x, { ledig: true, min: false }) : x));
      S.samtaleSvar = S.samtaleSvar.filter((s) => s.samtale_id !== d.samtale)
        .concat([{ samtale_id: d.samtale, player_id: S.profil.player_id, valg: d.valg, merknad, created_at: new Date().toISOString() }]);
      UI.melding = 'Forhåndsvisning: svaret er ikke sendt.';
      tegn();
      window.scrollTo(0, 0);
      return;
    }
    await api.rest('rpc/samtale_annen_losning', { metode: 'POST', kropp: { p_samtale: d.samtale, p_valg: d.valg, p_merknad: merknad } });
    await lastSamtaler();
    UI.melding = 'Takk! Treneren tar kontakt for å avtale.';
    tegn();
    window.scrollTo(0, 0);
  },

  async 'samtale-sett-inn'(d) {
    if (!erTrener()) return;
    if (!d.spiller) throw new Error('Velg spiller.');
    if (!d.tid) throw new Error('Velg tid.');
    const x = (S.trener.samtaleTider || []).find((y) => y.id === d.tid);
    await api.rest('rpc/book_samtaletid', { metode: 'POST', kropp: { p_tid: d.tid, p_spiller: d.spiller } });
    await lastSamtaler();
    UI.melding = spillerNavn(d.spiller) + ' er satt inn' + (x ? ' ' + tidTekst(x) : '') + '.';
    tegn();
    window.scrollTo(0, 0);
  },

  async 'bytt-passord'(d) {
    if (UI.visSom) throw new Error('Du kan ikke bytte passord i forhåndsvisningen.');
    sjekkPassord(d.passord, d.passord2);
    await api.brukerOppdater({ password: d.passord });
    UI.melding = 'Passordet er byttet.';
    tegn();
  },

  async 'ny-kode'(d) {
    const rolle = d.rolle;
    if (!ROLLE_NAVN[rolle]) throw new Error('Velg rolle.');
    const kropp = { purpose: 'ny_konto', role: rolle, full_name: null, player_id: null };
    if (rolle === 'spiller' || rolle === 'forelder') {
      if (!d.spiller) throw new Error(rolle === 'spiller' ? 'Velg spilleren.' : 'Velg barnet til forelderen.');
      kropp.player_id = d.spiller;
    }
    if (rolle === 'forelder' || rolle === 'trener') {
      const navn = String(d.navn || '').trim();
      if (navn.length < 2) throw new Error('Skriv navnet til den som skal ha kontoen.');
      kropp.full_name = navn;
    }
    if (rolle === 'spiller' && S.trener.profiler.some((p) => p.role === 'spiller' && p.player_id === d.spiller)) {
      throw new Error('Spilleren har allerede konto. Bruk «Nytt passord» hvis passordet er glemt.');
    }
    const rader = await api.rest('invites?select=code,purpose,role,full_name,player_id,user_id', { metode: 'POST', prefer: 'return=representation', kropp });
    const kode = rader[0];
    await lastTrener();
    UI.kodeResultat = { kode: kode.code, gjelder: kodeGjelder(kode), tekst: invitasjonTekst(kode.code, 'ny') };
    tegn();
    window.scrollTo(0, 0);
  },

  async 'passord-kode'(d) {
    if (!d.bruker) throw new Error('Velg hvem som trenger nytt passord.');
    const rader = await api.rest('invites?select=code,purpose,role,full_name,player_id,user_id', {
      metode: 'POST',
      prefer: 'return=representation',
      kropp: { purpose: 'nytt_passord', user_id: d.bruker }
    });
    const kode = rader[0];
    await lastTrener();
    UI.kodeResultat = { kode: kode.code, gjelder: kodeGjelder(kode), tekst: invitasjonTekst(kode.code, 'passord') };
    tegn();
    window.scrollTo(0, 0);
  }
};

async function vedSkjema(e) {
  const skjema = e.target.closest('form[data-skjema]');
  if (!skjema) return;
  e.preventDefault();
  const handling = SKJEMA[skjema.dataset.skjema];
  if (!handling) return;
  const data = Object.fromEntries(new FormData(skjema).entries());
  const knapp = skjema.querySelector('button[type="submit"]');
  const knappTekst = knapp ? knapp.textContent : '';
  const feilfelt = skjema.querySelector('.skjemafeil');
  if (feilfelt) feilfelt.hidden = true;
  if (knapp) {
    knapp.disabled = true;
    knapp.textContent = 'Vent …';
  }
  try {
    await handling(data);
  } catch (feil) {
    if (feil instanceof ApiFeil && feil.status === 401 && !api.okt) {
      nullstill();
      UI.melding = 'Du ble logget ut. Logg inn på nytt.';
      gaTil('');
      return;
    }
    if (document.body.contains(skjema)) {
      if (feilfelt) {
        feilfelt.textContent = feiltekst(feil);
        feilfelt.hidden = false;
      }
      if (knapp) {
        knapp.disabled = false;
        knapp.textContent = knappTekst;
      }
    }
  }
}

async function utfor(arbeid) {
  try {
    await arbeid();
  } catch (feil) {
    if (feil instanceof ApiFeil && feil.status === 401 && !api.okt) {
      nullstill();
      UI.melding = 'Du ble logget ut. Logg inn på nytt.';
      gaTil('');
      return;
    }
    UI.melding = '';
    alertFeil(feiltekst(feil));
  }
}

function alertFeil(tekst) {
  const main = document.getElementById('innhold');
  if (!main) return;
  const p = document.createElement('p');
  p.className = 'varsel feil';
  p.setAttribute('role', 'alert');
  p.textContent = tekst;
  main.prepend(p);
  window.scrollTo(0, 0);
}

async function vedKlikk(e) {
  const el = e.target.closest('[data-handling]');
  if (!el) return;
  const h = el.dataset.handling;
  if (h === 'periode') {
    UI.periode = el.dataset.id;
    tegn();
  } else if (h === 'fase') {
    UI.fase = el.dataset.navn;
    tegn();
  } else if (h === 'spill') {
    const i = S.inspirasjon.find((x) => x.id === el.dataset.id);
    const k = i && kildeFor(i.url);
    if (!k || !k.innbygg) return;
    const ramme = document.createElement('div');
    ramme.className = 'feed-media spiller ' + k.type + ' ' + k.format;
    ramme.innerHTML = '<iframe src="' + esc(k.innbygg) + '" title="' + esc(i.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    el.replaceWith(ramme);
  } else if (h === 'vis-som') {
    startVisning(el.dataset.rolle);
  } else if (h === 'avslutt-visning') {
    avsluttVisning();
  } else if (h === 'logg-ut') {
    if (UI.visSom) {
      alertFeil('Du ser siden som ' + UI.visSom + '. Trykk «Avslutt» øverst for å gå tilbake.');
      return;
    }
    await api.loggUt();
    nullstill();
    gaTil('');
  } else if (h === 'prov-igjen') {
    await last();
  } else if (h === 'lukk-kode') {
    UI.kodeResultat = null;
    tegn();
  } else if (h === 'kopier') {
    const kilde = document.getElementById(el.dataset.kilde);
    if (!kilde) return;
    try {
      await navigator.clipboard.writeText(kilde.value);
      el.textContent = 'Kopiert!';
    } catch (feil) {
      kilde.focus();
      kilde.select();
      el.textContent = 'Merk og kopier teksten';
    }
  } else if (h === 'samtykke-gi') {
    if (UI.visSom) {
      S.samtykker = S.samtykker.filter((c) => c.player_id !== el.dataset.spiller)
        .concat([{ player_id: el.dataset.spiller, version: KONFIG.samtykkeVersjon, accepted_at: new Date().toISOString(), withdrawn_at: null }]);
      UI.melding = 'Forhåndsvisning: samtykket er ikke lagret.';
      tegn();
      return;
    }
    el.disabled = true;
    await utfor(async () => {
      const spiller = el.dataset.spiller;
      const filter = 'player_id=eq.' + encodeURIComponent(spiller) + '&parent_id=eq.' + encodeURIComponent(S.profil.id)
        + '&version=eq.' + encodeURIComponent(KONFIG.samtykkeVersjon);
      const finnes = S.samtykker.some((c) => c.player_id === spiller && c.version === KONFIG.samtykkeVersjon);
      if (finnes) await api.rest('consents?' + filter, { metode: 'PATCH', prefer: 'return=minimal', kropp: { withdrawn_at: null } });
      else await api.rest('consents', { metode: 'POST', prefer: 'return=minimal', kropp: { player_id: spiller, parent_id: S.profil.id, version: KONFIG.samtykkeVersjon } });
      await lastForelder();
      UI.melding = 'Takk! Samtykket er registrert.';
      tegn();
    });
  } else if (h === 'samtykke-trekk') {
    if (!window.confirm('Vil du trekke samtykket? Da kan spilleren ikke legge inn nye opplysninger.')) return;
    if (UI.visSom) {
      const naa = new Date().toISOString();
      S.samtykker = S.samtykker.map((c) => (c.player_id === el.dataset.spiller && !c.withdrawn_at ? Object.assign({}, c, { withdrawn_at: naa }) : c));
      UI.melding = 'Forhåndsvisning: samtykket er ikke endret.';
      tegn();
      return;
    }
    el.disabled = true;
    await utfor(async () => {
      const filter = 'player_id=eq.' + encodeURIComponent(el.dataset.spiller) + '&parent_id=eq.' + encodeURIComponent(S.profil.id) + '&withdrawn_at=is.null';
      await api.rest('consents?' + filter, { metode: 'PATCH', prefer: 'return=minimal', kropp: { withdrawn_at: new Date().toISOString() } });
      await lastForelder();
      UI.melding = 'Samtykket er trukket.';
      tegn();
    });
  } else if (h === 'slett-hoyde') {
    if (!window.confirm('Slette denne målingen?')) return;
    if (UI.visSom) {
      S.hoyder = S.hoyder.filter((x) => x.id !== el.dataset.id);
      UI.melding = 'Forhåndsvisning: målingen er ikke slettet.';
      tegn();
      return;
    }
    await utfor(async () => {
      await api.rest('heights?id=eq.' + encodeURIComponent(el.dataset.id), { metode: 'DELETE', prefer: 'return=minimal' });
      await lastSpiller();
      UI.melding = 'Målingen er slettet.';
      tegn();
    });
  } else if (h === 'slett-logg') {
    if (!window.confirm('Slette loggen for denne økta?')) return;
    if (UI.visSom) {
      S.logger = S.logger.filter((l) => l.id !== el.dataset.id);
      UI.melding = 'Forhåndsvisning: loggen er ikke slettet.';
      gaTil('meg');
      return;
    }
    await utfor(async () => {
      await api.rest('session_logs?id=eq.' + encodeURIComponent(el.dataset.id), { metode: 'DELETE', prefer: 'return=minimal' });
      await lastSpiller();
      UI.melding = 'Loggen er slettet.';
      gaTil('meg');
    });
  } else if (h === 'slett-oppforing') {
    if (!window.confirm('Slette dette fra kalenderen?')) return;
    if (UI.visSom) {
      S.kalender = S.kalender.filter((o) => o.id !== el.dataset.id);
      UI.melding = 'Forhåndsvisning: ingenting er slettet.';
      gaTil('kalender?vis=min');
      return;
    }
    await utfor(async () => {
      const trener = S.profil.role === 'trener';
      const o = trener && S.trener.kalender.find((x) => x.id === el.dataset.id);
      await api.rest('personal_entries?id=eq.' + encodeURIComponent(el.dataset.id), { metode: 'DELETE', prefer: 'return=minimal' });
      UI.melding = 'Slettet fra kalenderen.';
      if (trener) {
        await lastTrener();
        gaTil(o ? 'spiller?id=' + encodeURIComponent(o.player_id) : 'trener');
      } else {
        await lastSpiller();
        gaTil('kalender?vis=min');
      }
    });
  } else if (h === 'slett-hendelse') {
    if (!window.confirm('Slette økta? Den forsvinner fra kalenderen til alle spillerne.')) return;
    await utfor(async () => {
      let rader;
      try {
        rader = await api.rest('events?id=eq.' + encodeURIComponent(el.dataset.id) + '&select=id', { metode: 'DELETE', prefer: 'return=representation' });
      } catch (feil) {
        if (feil instanceof ApiFeil && feil.kode === '23503') throw new Error('Noen har logget økta, så den kan ikke slettes. Velg «Avlyst» i stedet.');
        throw feil;
      }
      if (!rader || !rader.length) throw new Error('Fant ikke økta. Last siden på nytt og prøv igjen.');
      S.hendelser = (await api.rest('events?select=*&order=starts_at.asc')) || [];
      UI.melding = 'Økta er slettet.';
      gaTil('kalender');
    });
  } else if (h === 'oppdater') {
    location.reload();
  } else if (h === 'slett-inspirasjon') {
    if (!window.confirm('Slette innlegget fra feeden?')) return;
    const innlegg = S.inspirasjon.find((x) => x.id === el.dataset.id);
    const bilde = innlegg && innlegg.image_id && !S.inspirasjon.some((x) => x.id !== innlegg.id && x.image_id === innlegg.image_id)
      ? innlegg.image_id : null;
    await utfor(async () => {
      await api.rest('inspiration?id=eq.' + encodeURIComponent(el.dataset.id), { metode: 'DELETE', prefer: 'return=minimal' });
      if (bilde) await api.rest('media?id=eq.' + encodeURIComponent(bilde), { metode: 'DELETE', prefer: 'return=minimal' }).catch(() => null);
      S.inspirasjon = (await api.rest('inspiration?select=*&order=created_at.desc&limit=200')) || [];
      UI.melding = 'Slettet.';
      tegn();
    });
  } else if (h === 'slett-mal') {
    if (!window.confirm('Slette målet?')) return;
    const trener = S.profil.role === 'trener';
    if (UI.visSom) {
      S.mal = S.mal.filter((m) => m.id !== el.dataset.id);
      UI.melding = 'Forhåndsvisning: målet er ikke slettet.';
      gaTil('meg');
      return;
    }
    await utfor(async () => {
      const m = trener && S.trener.mal.find((x) => x.id === el.dataset.id);
      await api.rest('goals?id=eq.' + encodeURIComponent(el.dataset.id), { metode: 'DELETE', prefer: 'return=minimal' });
      UI.melding = 'Målet er slettet.';
      if (trener) {
        await lastTrener();
        gaTil(m ? 'spiller?id=' + encodeURIComponent(m.player_id) : 'trener');
      } else {
        await lastSpiller();
        gaTil('meg');
      }
    });
  } else if (h === 'book-samtale') {
    await bookSamtale(el);
  } else if (h === 'avbestill-samtale') {
    const har = S.samtaleTider.find((x) => x.samtale_id === el.dataset.samtale && x.min);
    if (!har || !window.confirm('Gi fra deg tiden ' + tidTekst(har) + '? Da kan noen andre ta den.')) return;
    if (UI.visSom) {
      S.samtaleTider = S.samtaleTider.map((x) => (x.id === har.id ? Object.assign({}, x, { ledig: true, min: false }) : x));
      UI.melding = 'Forhåndsvisning: ingenting er endret.';
      tegn();
      return;
    }
    el.disabled = true;
    await samtaleHandling(() => api.rest('rpc/avbestill_samtaletid', { metode: 'POST', kropp: { p_samtale: el.dataset.samtale } }), 'Tiden er gitt fra deg.');
  } else if (h === 'samtale-apen') {
    if (!erTrener()) return;
    const apne = el.dataset.apen === 'ja';
    if (!window.confirm(apne
      ? 'Åpne påmeldingen nå? Spillerne kan booke med en gang.'
      : 'Stenge påmeldingen? Spillerne kan ikke booke, bytte eller svare før du åpner igjen.')) return;
    el.disabled = true;
    await samtaleHandling(async () => {
      const rader = await api.rest('samtaler?id=eq.' + encodeURIComponent(el.dataset.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp: { apen: apne } });
      if (!rader || !rader.length) throw new Error('Fikk ikke endret påmeldingen. Last siden på nytt.');
    }, apne ? 'Påmeldingen er åpen. Send meldingen i Hoopit nå.' : 'Påmeldingen er stengt.');
  } else if (h === 'samtale-frigjor') {
    if (!erTrener()) return;
    const x = (S.trener.samtaleTider || []).find((y) => y.id === el.dataset.id);
    if (!x || !window.confirm('Frigjøre ' + tidTekst(x) + ' for ' + spillerNavn(x.player_id) + '?')) return;
    el.disabled = true;
    await samtaleHandling(async () => {
      const rader = await api.rest('samtale_tider?id=eq.' + encodeURIComponent(x.id) + '&select=id', { metode: 'PATCH', prefer: 'return=representation', kropp: { player_id: null, booked_at: null } });
      if (!rader || !rader.length) throw new Error('Fikk ikke frigjort tiden. Last siden på nytt.');
    }, tidTekst(x) + ' er ledig igjen.');
  } else if (h === 'samtale-fjern-svar') {
    if (!erTrener()) return;
    if (!window.confirm('Fjerne svaret fra ' + spillerNavn(el.dataset.spiller) + '? Da havner han under «Ikke svart».')) return;
    el.disabled = true;
    await samtaleHandling(() => api.rest('samtale_svar?samtale_id=eq.' + encodeURIComponent(el.dataset.samtale)
      + '&player_id=eq.' + encodeURIComponent(el.dataset.spiller), { metode: 'DELETE', prefer: 'return=minimal' }), 'Svaret er fjernet.');
  } else if (h === 'slett-kode') {
    if (!window.confirm('Slette koden? Den kan ikke brukes etterpå.')) return;
    await utfor(async () => {
      await api.rest('invites?code=eq.' + encodeURIComponent(el.dataset.kode), { metode: 'DELETE', prefer: 'return=minimal' });
      await lastTrener();
      UI.melding = 'Koden er slettet.';
      tegn();
    });
  }
}

/* ---------- Ny versjon av siden ---------- */

/*
 * index.html laster app.js?v=… der v endres for hver ny versjon. Nettleseren kan likevel vise
 * en gammel kopi en stund etter at siden er oppdatert, og en app på hjemskjermen lastes sjelden
 * på nytt. Derfor sjekker siden ved start og når den vises igjen om index.html peker på en ny
 * versjon, og viser i så fall en knapp for å laste inn på nytt.
 */
const VERSJON = (() => {
  try {
    return new URL(document.currentScript.src).searchParams.get('v') || '';
  } catch (e) {
    return '';
  }
})();
let sistSjekket = 0;

function nyVersjonFra(html) {
  const funnet = String(html).match(/app\.js\?v=([\w-]+)/);
  return funnet && funnet[1] !== VERSJON ? funnet[1] : '';
}

async function sjekkVersjon() {
  if (!VERSJON || document.querySelector('.oppdatering') || Date.now() - sistSjekket < 60000) return;
  sistSjekket = Date.now();
  try {
    const svar = await fetch(location.pathname + '?versjon=' + Date.now(), { cache: 'no-store' });
    if (svar.ok && nyVersjonFra(await svar.text())) visOppdatering();
  } catch (e) {
    /* uten nett: prøver igjen neste gang siden vises */
  }
}

function visOppdatering() {
  const el = document.createElement('div');
  el.className = 'oppdatering';
  el.setAttribute('role', 'status');
  el.innerHTML = '<p><strong>Siden er oppdatert</strong>Last inn på nytt for å få det nyeste.</p>'
    + '<button type="button" data-handling="oppdater">Last inn</button>';
  document.body.appendChild(el);
}

/* ---------- Tegning og oppstart ---------- */

const SIDER = {
  hjem: ['Hjem', visHjem],
  mer: ['Mer', visMer],
  egentrening: ['Egentrening', visEgentrening],
  inspirasjon: ['Hjem', visHjem],
  oppforing: ['Min kalender', visOppforing],
  hendelse: ['Økt', visHendelse],
  uke: ['Denne uka', visUke],
  kalender: ['Kalender', visKalender],
  spillmodell: ['Spillmodell', visSpillmodell],
  plan: ['Utviklingsplan', visPlan],
  meg: ['Meg', visMeg],
  logg: ['Logg økta', visLogg],
  mal: ['Utviklingsmål', visMal],
  trener: ['Trener', visTrener],
  okt: ['Logg fra økta', visOkt],
  spiller: ['Spiller', visSpiller],
  samtale: ['Spillersamtale', visSamtale]
};

/* Hvem som kan åpne hvilke sider. Resten er for alle innloggede. */
const SIDE_ROLLER = {
  logg: ['spiller'], oppforing: ['spiller', 'trener'], mal: ['spiller', 'trener'],
  trener: ['trener'], okt: ['trener'], spiller: ['trener'], hendelse: ['trener']
};

function gjeldendeRute() {
  return location.hash.replace(/^#\/?/, '').split('?')[0];
}

function tegn() {
  const app = document.getElementById('app');
  const rute = gjeldendeRute();
  let html;
  let tittel = 'Kolbotn G2011';
  if (!api.okt) {
    html = rute === 'forste-gang' ? visForsteGang() : rute === 'nytt-passord' ? visNyttPassord() : visInnlogging();
  } else if (S.lastFeil) {
    html = visLastFeil();
  } else if (!S.profil) {
    html = visUtenProfil();
  } else {
    let navn = SIDER[rute] ? rute : 'hjem';
    if (SIDE_ROLLER[navn] && !SIDE_ROLLER[navn].includes(S.profil.role)) navn = 'hjem';
    html = ramme(navn, SIDER[navn][1]());
    tittel = SIDER[navn][0] + ' – Kolbotn G2011';
  }
  app.innerHTML = html;
  document.title = tittel;
  visBilder();
  /* Til toppen ved ny side, men ikke når man bare blar mellom uker. */
  const sti = location.hash.replace(/[?&]uke=[^&]*/, '');
  if (sti !== UI.forrigeRute) {
    UI.forrigeRute = sti;
    window.scrollTo(0, 0);
  }
  UI.melding = '';
}

async function last() {
  if (!api.okt) {
    tegn();
    return;
  }
  document.getElementById('app').innerHTML = '<p class="laster">Laster …</p>';
  try {
    await lastAlt();
  } catch (feil) {
    if (feil instanceof ApiFeil && feil.status === 401) {
      api.settOkt(null);
      nullstill();
    } else {
      S.lastFeil = feiltekst(feil);
    }
  }
  tegn();
}

function start() {
  api.hentLagret();
  window.addEventListener('hashchange', tegn);
  document.addEventListener('click', vedKlikk);
  document.addEventListener('submit', vedSkjema);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sjekkVersjon();
  });
  last();
  sjekkVersjon();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') start();
