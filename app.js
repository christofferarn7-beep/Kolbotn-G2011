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
  sjekk: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
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
  for (const linje of linjer) {
    const t = linje.trim();
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
  barn: [],
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
  S.barn = [];
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
  const [perioder, hendelser, sider] = await Promise.all([
    api.rest('periods?select=*&order=start_date.asc'),
    api.rest('events?select=*&order=starts_at.asc'),
    api.rest('pages?select=slug,title,body,audience,sort&order=sort.asc')
  ]);
  S.perioder = perioder || [];
  S.hendelser = hendelser || [];
  S.sider = {};
  for (const side of sider || []) S.sider[side.slug] = side;
  if (S.profil.role === 'spiller') await lastSpiller();
  if (S.profil.role === 'forelder') await lastForelder();
  if (S.profil.role === 'trener') await lastTrener();
}

async function lastSpiller() {
  const pid = encodeURIComponent(S.profil.player_id);
  const [spillere, samtykker, hoyder] = await Promise.all([
    api.rest('players?select=id,full_name,position&id=eq.' + pid),
    api.rest('consents?select=player_id,version,accepted_at,withdrawn_at&player_id=eq.' + pid),
    api.rest('heights?select=id,measured_on,height_cm,created_at&player_id=eq.' + pid + '&order=measured_on.desc&limit=24')
  ]);
  S.spiller = (spillere && spillere[0]) || null;
  S.samtykker = samtykker || [];
  S.hoyder = hoyder || [];
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
  const [spillere, profiler, lenker, samtykker, koder, soner] = await Promise.all([
    api.rest('players?select=id,full_name,position,active&order=full_name.asc'),
    api.rest('profiles?select=id,username,full_name,role,player_id&order=full_name.asc'),
    api.rest('parent_links?select=parent_id,player_id'),
    api.rest('consents?select=player_id,parent_id,version,accepted_at,withdrawn_at'),
    api.rest('invites?select=code,purpose,role,full_name,player_id,user_id,created_at,expires_at,used_at&order=created_at.desc&limit=300'),
    api.rest('vekstsoner?select=*')
  ]);
  S.trener = {
    spillere: spillere || [],
    profiler: profiler || [],
    lenker: lenker || [],
    samtykker: samtykker || [],
    koder: koder || [],
    soner: soner || []
  };
}

function harSamtykke(spillerId) {
  return S.samtykker.some((c) => c.player_id === spillerId && !c.withdrawn_at);
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

function ramme(aktiv, innhold) {
  const faner = [
    ['uke', 'Denne uka', IKON.hus],
    ['kalender', 'Kalender', IKON.kalender],
    ['spillmodell', 'Spillmodell', IKON.bane]
  ];
  if (S.profil.role === 'trener') faner.push(['trener', 'Trener', IKON.tavle]);
  faner.push(['meg', 'Meg', IKON.person]);
  const meny = faner.map(([rute, navn, ikon]) => '<a class="fane" href="#/' + rute + '"'
    + (rute === aktiv || (aktiv === 'plan' && rute === 'spillmodell') ? ' aria-current="page"' : '') + '>' + ikon + esc(navn) + '</a>').join('');
  const melding = UI.melding ? '<p class="varsel ok" role="status">' + esc(UI.melding) + '</p>' : '';
  return '<header class="topp"><a class="merke" href="#/uke"><img src="img/kolbotn-logo.png" alt="" width="26" height="32"><span>Kolbotn G2011</span></a>'
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

  if (S.profil.role === 'spiller' && harSamtykke(S.profil.player_id)) html += hoydePaaminnelse();

  if (neste) {
    const d = dagInfo(neste.starts_at);
    const fakta = hendelseFakta(neste);
    html += '<section class="kort"><div class="kort-topp"><p class="overlinje">Neste</p>' + merkelapp(neste) + '</div>'
      + '<p><strong>' + esc(d.lang) + '</strong></p>'
      + '<p class="tid-stor">' + esc(tidTekst(neste)) + '</p>'
      + '<p>' + esc(neste.title) + '</p>'
      + (fakta.length ? '<div class="fakta">' + fakta.join('') + '</div>' : '')
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
  if (!fakta.length) return '<div class="rad">' + topp + '</div>';
  return '<details><summary class="rad">' + topp + '</summary><div class="detaljer">' + fakta.join('') + '</div></details>';
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
  let html = '<div class="overskrift"><h1>Kalender</h1><p class="dempet">Treninger, kamper og periodene i årshjulet</p></div>';
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
    return html + '<section class="kort tomt"><p><strong>Ingen aktiviteter lagt inn ennå</strong></p><p class="dempet liten">Treninger og kamper kommer her når tidene er klare.</p></section>';
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
  const pid = S.profil.player_id;
  if (!harSamtykke(pid)) {
    return '<section class="kort tomt"><h2>Høyde</h2><p>Foresatte må gi samtykke før du kan legge inn høyden.</p>'
      + '<p class="dempet liten">Be dem logge inn med koden de har fått fra treneren, og godkjenne under «Meg».</p></section>';
  }
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

  const soner = new Map(t.soner.map((s) => [s.player_id, s]));
  html += '<section class="uke"><h2>Spillere</h2><div class="liste">'
    + aktiveSpillere.map((s) => {
      const foreldre = t.lenker.filter((l) => l.player_id === s.id).length;
      const samtykke = t.samtykker.some((c) => c.player_id === s.id && !c.withdrawn_at);
      const sone = soner.get(s.id);
      const sk = sone && SONE[sone.sone];
      return '<div class="rad spillerrad"><div class="rad-tekst"><span class="navn">' + esc(s.full_name) + '</span>'
        + '<span class="under">' + esc(POSISJON_NAVN[s.position] || '') + ' · ' + (harKonto.has(s.id) ? 'har konto' : 'ingen konto')
        + ' · ' + foreldre + (foreldre === 1 ? ' forelder' : ' foreldre') + '</span></div>'
        + '<div class="merker">' + (samtykke ? '<span class="merkelapp sone-gronn">Samtykke</span>' : '<span class="merkelapp">Uten samtykke</span>')
        + (sk && sone.sone !== 'mangler' ? '<span class="merkelapp ' + sk.klasse + '">' + esc(sk.navn) + '</span>' : '') + '</div></div>';
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

  const naa = Date.now();
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

function visningsBanner() {
  if (!UI.visSom) return '';
  return '<div class="visning" role="status"><p><strong>Du ser siden som ' + (UI.visSom === 'spiller' ? 'spiller' : 'forelder') + '</strong>'
    + 'Oppdiktet spiller. Ingenting lagres.</p>'
    + '<button type="button" data-handling="avslutt-visning">Avslutt</button></div>';
}

function startVisning(rolle) {
  if (!S.profil || S.profil.role !== 'trener' || UI.visSom) return;
  if (rolle !== 'spiller' && rolle !== 'forelder') return;
  UI.ekte = { profil: S.profil, sider: S.sider, spiller: S.spiller, samtykker: S.samtykker, hoyder: S.hoyder, barn: S.barn };
  UI.visSom = rolle;
  UI.kodeResultat = null;
  S.sider = Object.fromEntries(Object.entries(S.sider).filter(([, side]) => side.audience === 'alle'));
  if (rolle === 'spiller') {
    S.profil = { id: 'demo-profil', username: 'ola.n', full_name: DEMO_SPILLER.full_name, role: 'spiller', player_id: DEMO_SPILLER.id };
    S.spiller = DEMO_SPILLER;
    S.samtykker = [{ player_id: DEMO_SPILLER.id, version: KONFIG.samtykkeVersjon, accepted_at: new Date().toISOString(), withdrawn_at: null }];
    S.hoyder = demoHoyder();
    S.barn = [];
  } else {
    S.profil = { id: 'demo-profil', username: 'kari.n', full_name: 'Kari Nordmann', role: 'forelder', player_id: null };
    S.spiller = null;
    S.samtykker = [];
    S.hoyder = [];
    S.barn = [DEMO_SPILLER];
  }
  gaTil(rolle === 'forelder' ? 'meg' : 'uke');
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
    gaTil('uke');
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
    gaTil(S.profil && S.profil.role === 'forelder' ? 'meg' : 'uke');
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
      gaTil('uke');
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

/* ---------- Tegning og oppstart ---------- */

const SIDER = {
  uke: ['Denne uka', visUke],
  kalender: ['Kalender', visKalender],
  spillmodell: ['Spillmodell', visSpillmodell],
  plan: ['Utviklingsplan', visPlan],
  meg: ['Meg', visMeg],
  trener: ['Trener', visTrener]
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
    let navn = SIDER[rute] ? rute : 'uke';
    if (navn === 'trener' && S.profil.role !== 'trener') navn = 'uke';
    html = ramme(navn, SIDER[navn][1]());
    tittel = SIDER[navn][0] + ' – Kolbotn G2011';
  }
  app.innerHTML = html;
  document.title = tittel;
  if (rute !== UI.forrigeRute) {
    UI.forrigeRute = rute;
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
  last();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') start();
