/* =========================================================
   Pulso · Finanzas — lógica de la app (v1, sin dependencias)
   - Los montos se guardan en CENTAVOS (enteros) para no perder precisión.
   - Todo se guarda en este navegador (localStorage).
   ========================================================= */
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** true cuando corre dentro de la app de Android (Capacitor) */
const NATIVE = !!window.Capacitor?.isNativePlatform?.();

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const monthKey = (iso) => iso.slice(0, 7);
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
function addMonths(iso, n) {
  const d = parseISO(iso);
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return toISO(t);
}
const endOfMonth = (iso) => { const d = parseISO(iso); return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const monthLabel = (mk, long = false) => { const [y, m] = mk.split('-').map(Number); return long ? `${MONTHS_L[m - 1]} ${y}` : `${MONTHS[m - 1]}`; };
function dayLabel(iso) {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1) return 'Mañana';
  const d = parseISO(iso);
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const shortDate = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

/* ---------- Dinero ---------- */
const fmtCache = {};
function fmt(cents, cur = 'ARS', compact = false) {
  const k = cur + compact;
  if (!fmtCache[k]) {
    fmtCache[k] = new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: cur,
      minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 0 : 2,
    });
  }
  return fmtCache[k].format((cents || 0) / 100);
}
function fmtShort(cents) {
  const v = Math.abs(cents / 100);
  const sign = cents < 0 ? '-' : '';
  if (v >= 1e6) return `${sign}${(v / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e3) return `${sign}${Math.round(v / 1e3).toLocaleString('es-AR')} k`;
  return `${sign}${Math.round(v)}`;
}
/** Convierte texto argentino ("12.345,67", "$ 1.500", "1500.5") a centavos. */
function parseMoney(str) {
  if (str == null) return NaN;
  let s = String(str).replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = s.split('.');
    if (parts.length > 2) s = parts.join('');
    else if (parts.length === 2 && parts[1].length === 3) s = parts.join('');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
const toARS = (cents, cur) => (cur === 'USD' ? Math.round(cents * S.settings.usd) : cents);
/** Muestra un monto en pesos según la moneda elegida arriba (ARS o USD). */
function show(arsCents, compact = false) {
  if (S.settings.view === 'USD') return fmt(Math.round(arsCents / S.settings.usd), 'USD', compact);
  return fmt(arsCents, 'ARS', compact);
}

/* ---------- Imágenes: íconos 3D (Fluent Emoji, MIT) y logos ---------- */
const ICON_LIB = ['carrito', 'hamburguesa', 'pizza', 'cubiertos', 'cafe', 'cerveza', 'colectivo', 'auto', 'nafta', 'avion',
  'casa', 'casa-jardin', 'lamparita', 'agua', 'wifi', 'tele', 'celular', 'laptop', 'joystick', 'musica', 'cine', 'guitarra', 'camara',
  'pastilla', 'hospital', 'pesa', 'biceps', 'pelota', 'fiesta', 'ticket', 'regalo', 'remera', 'bolsas', 'tijera', 'libros', 'birrete',
  'perro', 'gato', 'bebe', 'planta', 'brote', 'herramientas', 'llave', 'paquete', 'carta', 'recibo', 'calendario', 'maletin',
  'etiqueta', 'brillos', 'banco', 'billete', 'dolar', 'moneda', 'tarjeta', 'bolsa-plata', 'chanchito', 'grafico', 'grafico-baja',
  'diamante', 'playa', 'salvavidas', 'diana', 'cohete', 'trofeo', 'estrella', 'corazon', 'fuego', 'mundo', 'apreton',
  'transferencia', 'balanza', 'alerta', 'campana', 'lupa', 'pregunta'];
/* Logos actuales (íconos de app de la App Store Argentina). Formato: [archivo, nombre, ...otras formas de escribirlo]
   Un alias que empieza con "=" solo coincide si es el texto completo (ej: "Personal"). */
const LOGO_GROUPS = [
  ['Bancos y billeteras', [
    ['brubank', 'Brubank'], ['mercadopago', 'Mercado Pago', 'MP'], ['uala', 'Ualá'], ['naranjax', 'Naranja X', 'Naranja'],
    ['galicia', 'Galicia'], ['santander', 'Santander'], ['bbva', 'BBVA', 'Francés'], ['nacion', 'Banco Nación', 'BNA'],
    ['provincia', 'Cuenta DNI', 'Banco Provincia'], ['macro', 'Macro'], ['icbc', 'ICBC'], ['patagonia', 'Banco Patagonia'],
    ['modo', 'MODO'], ['personalpay', 'Personal Pay'], ['prex', 'Prex'], ['lemon', 'Lemon'], ['belo', 'Belo'],
    ['binance', 'Binance'], ['cocos', 'Cocos'],
  ]],
  ['Transporte y nafta', [
    ['sube', 'SUBE', 'Carga SUBE'], ['uber', 'Uber'], ['cabify', 'Cabify'], ['didi', 'DiDi'],
    ['ypf', 'YPF'], ['shell', 'Shell'], ['axion', 'Axion'],
  ]],
  ['Comida y súper', [
    ['mostaza', 'Mostaza'], ['mcdonalds', "McDonald's", 'McDonalds', 'Mc Donalds', 'Mc'], ['burgerking', 'Burger King'], ['kfc', 'KFC'],
    ['starbucks', 'Starbucks'], ['havanna', 'Havanna'], ['rappi', 'Rappi'], ['pedidosya', 'PedidosYa', 'Pedidos Ya'],
    ['coto', 'Coto'], ['carrefour', 'Carrefour'], ['dia', 'Día', 'Super Día'], ['jumbo', 'Jumbo'], ['disco', 'Disco'], ['changomas', 'ChangoMas', 'Chango Más'],
  ]],
  ['Servicios', [
    ['personal', 'Personal Flow', '=Personal', 'Mi Personal'], ['flow', 'Flow'], ['movistar', 'Movistar'], ['claro', 'Claro'],
    ['telecentro', 'Telecentro'], ['edenor', 'Edenor'], ['edesur', 'Edesur'], ['metrogas', 'Metrogas'], ['aysa', 'AySA'],
  ]],
  ['Streaming, juegos y apps', [
    ['netflix', 'Netflix'], ['spotify', 'Spotify'], ['youtube', 'YouTube'], ['disney', 'Disney+', 'Disney'], ['max', 'HBO Max', '=Max'],
    ['primevideo', 'Prime Video', 'Amazon Prime'], ['paramount', 'Paramount+', 'Paramount'], ['crunchyroll', 'Crunchyroll'],
    ['twitch', 'Twitch'], ['applemusic', 'Apple Music'], ['steam', 'Steam'], ['xbox', 'Xbox', 'Game Pass'],
    ['playstation', 'PlayStation', 'PS Plus'], ['chatgpt', 'ChatGPT', 'OpenAI'], ['claude', 'Claude', 'Anthropic'], ['googleone', 'Google One'],
  ]],
  ['Compras y gimnasio', [
    ['mercadolibre', 'Mercado Libre', 'MercadoLibre', 'MeLi'], ['amazon', 'Amazon'], ['temu', 'Temu'], ['shein', 'Shein'],
    ['aliexpress', 'AliExpress'], ['tiendamia', 'Tiendamia'], ['smartfit', 'Smart Fit'], ['megatlon', 'Megatlon'],
  ]],
];
const LOGOS = LOGO_GROUPS.flatMap(([, list]) => list);
const EMOJI_MAP = {
  '🛒': 'carrito', '🍔': 'hamburguesa', '🚌': 'colectivo', '🏠': 'casa', '💡': 'lamparita', '📺': 'tele', '💊': 'pastilla',
  '🏋️': 'pesa', '🏋': 'pesa', '🎉': 'fiesta', '👕': 'remera', '📚': 'libros', '📦': 'paquete', '💼': 'maletin', '💻': 'laptop',
  '🏷️': 'etiqueta', '🏷': 'etiqueta', '✨': 'brillos', '🏦': 'banco', '📱': 'celular', '💵': 'billete', '💲': 'dolar', '💳': 'tarjeta',
  '🪙': 'moneda', '🐷': 'chanchito', '📈': 'grafico', '🏧': 'banco', '🏖️': 'playa', '🏖': 'playa', '🛟': 'salvavidas', '🎯': 'diana',
  '🔁': 'transferencia', '⚖️': 'balanza', '❔': 'pregunta', '🤝': 'apreton', '🧾': 'recibo', '💰': 'bolsa-plata',
};
const isImg = (v) => /^(img\/|https?:\/\/|data:image\/)/.test(v || '');
/** Devuelve el ícono como <img> (o el emoji si es texto). size: '', 'sm' o 'xs'. */
function ico(v, size = '') {
  if (!isImg(v)) return `<span class="emoji ${size}">${esc(v || '💰')}</span>`;
  const kind = /^data:/.test(v) ? ' photo' : /logo-|^https?:/.test(v) ? ' logo' : '';
  return `<span class="emoji ${size}${kind}"><img src="${esc(v)}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('broken');this.remove()"></span>`;
}
const squash = (s) => norm(s).replace(/[^a-z0-9]/g, '');
/** Busca un logo conocido dentro de un texto ("Pago Netflix" → logo de Netflix). */
const words = (s) => norm(s).replace(/[^a-z0-9]+/g, ' ').trim();
function findLogo(text) {
  const w = words(text);
  if (!w) return null;
  const padded = ` ${w} `;
  const sq = w.replace(/ /g, '');
  const hit = LOGOS.find(([, ...names]) => names.some((name) => {
    if (name.startsWith('=')) return w === words(name.slice(1));
    const n = words(name);
    // palabra completa ("Super Día" sí, "mediodía" no) o junto sin espacios ("MercadoPago")
    return padded.includes(` ${n} `) || (n.includes(' ') && sq.includes(n.replace(/ /g, '')));
  }));
  return hit ? `img/logo-${hit[0]}.png` : null;
}
const faviconOf = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain.trim().replace(/^https?:\/\//, '').split('/')[0])}&sz=128`;

/* ---------- Estado ---------- */
const KEY = 'pulso.v1';
function loadState() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
let S = loadState() || seedDemo();
migrate();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* sin almacenamiento */ } }
/** Guarda y, si cambiaron los datos (no solo la vista), agenda la sincronización. */
function save() {
  const sig = dataSig();
  if (sig !== lastDataHash) {
    lastDataHash = sig;
    if (S.sync?.code) { S.sync.dirty = true; scheduleSync(); }
    remindersSoon();
  }
  persist();
}
const dataSig = () => JSON.stringify([S.accounts, S.categories, S.txs, S.pendings, S.goals, S.budgets, S.spaces, S.plan, S.settings.usd]);
let lastDataHash = null;
/** Reemplaza todo el estado (ejemplo, borrar, restaurar) sin perder la sincronización. */
function replaceState(next) { const sync = S.sync; S = next; S.sync = sync; migrate(); }
function migrate() {
  S.settings = Object.assign({ usd: 1730, usdKind: 'blue', theme: 'auto', view: 'ARS' }, S.settings || {});
  S.ui = Object.assign({ q: '', type: 'all', account: 'all', cat: 'all', period: 'month', sort: 'date-desc', group: 'day', ptab: 'pagar', psort: 'due-asc' }, S.ui || {});
  S.budgets = S.budgets || {};
  S.goals = S.goals || [];
  S.pendings = S.pendings || [];
  S.spaces = Array.isArray(S.spaces) ? S.spaces : [];
  if (!S.spaces.some((s) => s.id === 'personal')) S.spaces.unshift({ id: 'personal', name: 'Personal', emoji: 'img/casa.png', kind: 'personal' });
  S.plan = S.plan || {};
  // v2: los emojis pasan a ser imágenes (y las cuentas conocidas usan su logo)
  const toImg = (e) => (e && !isImg(e) && EMOJI_MAP[e] ? `img/${EMOJI_MAP[e]}.png` : e);
  S.accounts.forEach((a) => { if (!isImg(a.emoji)) a.emoji = findLogo(a.name) || toImg(a.emoji) || 'img/banco.png'; });
  S.categories.forEach((c) => { c.emoji = toImg(c.emoji); });
  S.goals.forEach((g) => { g.emoji = toImg(g.emoji); });
}

const acc = (id) => S.accounts.find((a) => a.id === id);
const cat = (id) => S.categories.find((c) => c.id === id);
const accName = (id) => acc(id)?.name || 'Cuenta borrada';
const catOf = (t) => cat(t.categoryId) || { name: t.type === 'transferencia' ? 'Transferencia' : t.type === 'ajuste' ? 'Ajuste de saldo' : 'Sin categoría', emoji: t.type === 'transferencia' ? 'img/transferencia.png' : t.type === 'ajuste' ? 'img/balanza.png' : 'img/pregunta.png' };

function balances() {
  const b = {};
  S.accounts.forEach((a) => { b[a.id] = a.initial || 0; });
  for (const t of S.txs) {
    if (!(t.accountId in b)) continue;
    if (t.type === 'ingreso') b[t.accountId] += t.amount;
    else if (t.type === 'gasto') b[t.accountId] -= t.amount;
    else if (t.type === 'ajuste') b[t.accountId] += t.amount;
    else if (t.type === 'transferencia') {
      b[t.accountId] -= t.amount;
      if (t.toAccountId in b) b[t.toAccountId] += t.toAmount ?? t.amount;
    }
  }
  return b;
}
function txCur(t) { return acc(t.accountId)?.currency || 'ARS'; }
function monthStats(mk, sp = curSpace()) {
  let income = 0, expense = 0, ownerPaid = 0;
  const byCat = {};
  for (const t of S.txs) {
    if (monthKey(t.date) !== mk) continue;
    // Sueldo que te pagás desde el negocio: ingreso para tu plata personal, "te pagaste" para el negocio
    if (t.ownerPay && sp !== 'all') {
      const fromIn = inSpace(t.accountId, sp), toIn = inSpace(t.toAccountId, sp);
      if (toIn && !fromIn) income += toARS(t.toAmount ?? t.amount, acc(t.toAccountId)?.currency);
      else if (fromIn && !toIn) ownerPaid += toARS(t.amount, txCur(t));
      continue;
    }
    if (!inSpace(t.accountId, sp)) continue;
    const v = toARS(t.amount, txCur(t));
    if (t.type === 'ingreso') income += v;
    if (t.type === 'gasto') { expense += v; byCat[t.categoryId] = (byCat[t.categoryId] || 0) + v; }
  }
  return { income, expense, net: income - expense, byCat, ownerPaid };
}
const openPendings = () => S.pendings.filter((p) => !p.done);
/* Moneda de un pendiente: puede ser distinta a la de la cuenta (ej: Duolingo US$ 12 pagado con Brubank en pesos) */
const pCur = (p) => p.cur || acc(p.accountId)?.currency || 'ARS';
const cardRate = () => S.settings.usdCard || S.settings.usd;
/** Cuánto se estima que sale en la moneda de la cuenta. Dólares pagados en pesos → dólar tarjeta (con impuestos). */
function pendEst(p) {
  const pc = pCur(p), ac = acc(p.accountId)?.currency || pc;
  if (pc === ac) return { amount: p.amount, cur: ac };
  if (pc === 'USD') return { amount: Math.round(p.amount * cardRate()), cur: 'ARS' };
  return { amount: Math.round(p.amount / S.settings.usd), cur: 'USD' };
}
const pARS = (p) => { const e = pendEst(p); return toARS(e.amount, e.cur); };
/** Hay que preguntar cuánto fue: el monto cambia o está en otra moneda que la cuenta. */
const needsAsk = (p) => !!p.variable || pCur(p) !== (acc(p.accountId)?.currency || pCur(p));

/* ---------- Espacios: separar la plata (ej: Personal y Mi negocio) ----------
   Cada cuenta pertenece a un espacio; los movimientos y pendientes van con su cuenta. */
const spaceById = (id) => S.spaces.find((s) => s.id === id);
const spaceOf = (a) => (a && spaceById(a.space) ? a.space : 'personal');
const multiSpace = () => S.spaces.length > 1;
const curSpace = () => (multiSpace() && spaceById(S.ui.space) ? S.ui.space : 'all');
const isBiz = (sp = curSpace()) => spaceById(sp)?.kind === 'negocio';
const inSpace = (accountId, sp = curSpace()) => sp === 'all' || spaceOf(acc(accountId)) === sp;
const txInSpace = (t, sp = curSpace()) => inSpace(t.accountId, sp) || (t.type === 'transferencia' && inSpace(t.toAccountId, sp));
const visAccounts = (sp = curSpace()) => S.accounts.filter((a) => sp === 'all' || spaceOf(a) === sp);
const visPendings = (sp = curSpace()) => openPendings().filter((p) => inSpace(p.accountId, sp));
/** Categorías para un espacio: las generales en Personal; en un negocio, las suyas primero y después las generales. */
function catsFor(kind, sp = curSpace()) {
  const list = S.categories.filter((c) => c.kind === kind);
  if (sp === 'all') return list;
  const home = (c) => (spaceById(c.space) ? c.space : 'personal');
  const own = list.filter((c) => home(c) === sp);
  if (sp === 'personal') return own;
  const names = new Set(own.map((c) => norm(c.name)));
  return [...own, ...list.filter((c) => home(c) === 'personal' && !names.has(norm(c.name)))];
}
/** Los centavos se ven más chicos que el número (son lo menos importante). */
const cents = (s) => String(s).replace(/,(\d{2})$/, '<span class="cents">,$1</span>');

/* ---------- Adivinar categoría ---------- */
const KEYWORDS = [
  [/(super|coto|carrefour|jumbo|\bdia\b|disco|vea|changomas|chino|almacen|verduler|carniceri|panaderi)/, 'Comida'],
  [/(rappi|pedidos ?ya|mc ?donald|\bmc\b|burger|mostaza|kfc|delivery|pizza|empanada|sushi)/, 'Delivery'],
  [/(sube|uber|cabify|didi|taxi|ypf|shell|axion|nafta|peaje|estacionamiento|colectivo|subte|tren)/, 'Transporte'],
  [/(netflix|spotify|disney|youtube|prime|hbo|\bmax\b|paramount|icloud|google one|chatgpt|claude|crunchyroll|twitch|apple music|game pass|ps plus|duolingo|canva|notion|adobe|xbox|steam)/, 'Suscripciones'],
  [/(starbucks|havanna|cafeteria)/, 'Salidas'],
  [/(shein|temu)/, 'Ropa'],
  [/(farmacia|farmacity|medico|osde|swiss|galeno|dentista|clinica|prepaga)/, 'Salud'],
  [/(edenor|edesur|metrogas|naturgy|aysa|personal|movistar|claro|fibertel|telecentro|flow|luz|gas|agua|internet|celular)/, 'Servicios'],
  [/(alquiler|expensas|abl|inmobiliaria)/, 'Casa'],
  [/(gym|gimnasio|smart ?fit|megatlon|crossfit)/, 'Gym'],
  [/(cine|bar|cerveza|boliche|recital|entrada|restaurant|resto|cafe)/, 'Salidas'],
  [/(zara|nike|adidas|ropa|zapatilla|remera|jean)/, 'Ropa'],
  [/(curso|udemy|platzi|libro|facultad|universidad|colegio)/, 'Educación'],
  [/(sueldo|salario|haberes|aguinaldo)/, 'Sueldo'],
  [/(freelance|cliente|proyecto|factura)/, 'Freelance'],
];
function guessCategory(desc, type) {
  const n = norm(desc);
  if (!n) return null;
  const prev = [...S.txs].reverse().find((t) => t.type === type && norm(t.desc) === n && cat(t.categoryId));
  if (prev) return prev.categoryId;
  for (const [re, name] of KEYWORDS) {
    if (re.test(n)) {
      const c = S.categories.find((c) => c.kind === type && norm(c.name) === norm(name));
      if (c) return c.id;
    }
  }
  return null;
}

/* ---------- Leer notificaciones (Brubank / Mercado Pago / bancos) ---------- */
function parseNotification(text, src = '') {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const m = t.match(/(US\$|U\$S|USD|\$)\s?([\d.]+(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const amount = parseMoney(m[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = /US|USD/i.test(m[1]) ? 'USD' : 'ARS';
  const low = norm(t);
  const type = /(recibiste|te (transfirio|envio|depositaron|pagaron|pago|llego)|acredit|ingreso de dinero|ingresaron|cobraste|reintegro|devolucion)/.test(low) ? 'ingreso' : 'gasto';
  let desc = '';
  const after = t.slice(m.index + m[0].length);
  const dm = after.match(/\b(?:en|a|de|por)\s+([^.,\n]{2,40})/i) || t.match(/\b(?:en|a|de)\s+([A-ZÁÉÍÓÚÑ][^.,\n]{1,40})/);
  if (dm) desc = dm[1].replace(/\s+(con|desde|el|por)\s.*$/i, '').trim();
  // "Te transfirió $ 80.000 Lucas Gómez" o "Lucas Gómez te transfirió $ 80.000"
  if (!desc) { const nm = after.match(/^\s*([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' ]{1,40})/); if (nm) desc = nm[1].trim(); }
  if (!desc) { const bm = t.match(/(?:^|\.\s)([A-ZÁÉÍÓÚÑ][^.$]{1,40}?)\s+te (?:transfiri[oó]|envi[oó]|pag[oó])/); if (bm) desc = bm[1].trim(); }
  if (!desc) desc = type === 'ingreso' ? 'Ingreso' : 'Gasto';
  let date = todayISO();
  const d = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (d) {
    const y = d[3] ? (d[3].length === 2 ? 2000 + Number(d[3]) : Number(d[3])) : new Date().getFullYear();
    const cand = toISO(new Date(y, Number(d[2]) - 1, Number(d[1])));
    if (!Number.isNaN(parseISO(cand).getTime())) date = cand;
  }
  const nameRe = src ? SRC_ACCOUNT.find(([p]) => p.test(src))?.[1] : /brubank/i;
  const account = (nameRe && S.accounts.find((a) => nameRe.test(a.name) && a.currency === currency))
    || (nameRe && S.accounts.find((a) => nameRe.test(a.name)))
    || S.accounts.find((a) => a.currency === currency && spaceOf(a) === 'personal') || S.accounts.find((a) => a.currency === currency);
  return { type, amount, desc, date, accountId: account?.id, categoryId: guessCategory(desc, type) };
}

/* ---------- Datos de ejemplo ---------- */
function seedDemo() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const between = (a, b) => Math.round((a + rnd() * (b - a)) / 100) * 100 * 100;

  const catsDef = [
    ['Comida', '🛒', 'gasto'], ['Delivery', '🍔', 'gasto'], ['Transporte', '🚌', 'gasto'], ['Casa', '🏠', 'gasto'],
    ['Servicios', '💡', 'gasto'], ['Suscripciones', '📺', 'gasto'], ['Salud', '💊', 'gasto'], ['Gym', '🏋️', 'gasto'],
    ['Salidas', '🎉', 'gasto'], ['Ropa', '👕', 'gasto'], ['Educación', '📚', 'gasto'], ['Otros', '📦', 'gasto'],
    ['Sueldo', '💼', 'ingreso'], ['Freelance', '💻', 'ingreso'], ['Ventas', '🏷️', 'ingreso'], ['Otros ingresos', '✨', 'ingreso'],
  ];
  const categories = catsDef.map(([name, emoji, kind], i) => ({ id: 'c' + i, name, emoji, kind }));
  const C = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const accounts = [
    { id: 'a1', name: 'Brubank', emoji: '🏦', currency: 'ARS', initial: 85000000 },
    { id: 'a2', name: 'Mercado Pago', emoji: '📱', currency: 'ARS', initial: 15000000 },
    { id: 'a3', name: 'Efectivo', emoji: '💵', currency: 'ARS', initial: 6000000 },
    { id: 'a4', name: 'Dólares', emoji: '💲', currency: 'USD', initial: 120000 },
  ];
  const txs = [];
  const today = todayISO();
  const add = (date, type, amount, desc, categoryId, accountId, extra = {}) => {
    if (date > today) return;
    txs.push({ id: uid(), date, type, amount, desc, categoryId, accountId, ...extra });
  };
  for (let back = 3; back >= 0; back--) {
    const first = addMonths(today.slice(0, 8) + '01', -back);
    const at = (day) => { const d = parseISO(first); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return toISO(d); };
    add(at(1), 'ingreso', 120000000, 'Sueldo', C.Sueldo, 'a1');
    if (back % 2 === 0) add(at(14), 'ingreso', between(250000, 420000), 'Cliente web — Nodo', C.Freelance, 'a2');
    add(at(10), 'gasto', 45000000, 'Alquiler', C.Casa, 'a1');
    add(at(12), 'gasto', between(30000, 42000), 'Edenor', C.Servicios, 'a1');
    add(at(15), 'gasto', 2800000, 'Internet Telecentro', C.Servicios, 'a1');
    add(at(5), 'gasto', 1190000, 'Netflix', C.Suscripciones, 'a1');
    add(at(6), 'gasto', 499000, 'Spotify', C.Suscripciones, 'a2');
    add(at(3), 'gasto', 4000000, 'Gimnasio', C.Gym, 'a2');
    add(at(2), 'transferencia', 20000000, 'Paso a Mercado Pago', null, 'a1', { toAccountId: 'a2' });
    add(at(7), 'transferencia', 10000000, 'Extracción cajero', null, 'a1', { toAccountId: 'a3' });
    for (let w = 0; w < 4; w++) {
      add(at(4 + w * 7), 'gasto', between(42000, 78000), ['Coto', 'Carrefour', 'Día', 'Chino de la esquina'][w], C.Comida, w % 2 ? 'a2' : 'a1');
      add(at(6 + w * 7), 'gasto', between(14000, 26000), ['Rappi', 'PedidosYa', 'Mostaza', 'Rappi'][w], C.Delivery, 'a2');
      add(at(2 + w * 7), 'gasto', between(5000, 10000), 'Carga SUBE', C.Transporte, 'a2');
      if (w % 2 === 1) add(at(8 + w * 7), 'gasto', between(25000, 60000), ['Cine y cena', 'Bar con amigos'][w > 1 ? 1 : 0], C.Salidas, 'a3');
    }
    if (back === 1) add(at(20), 'gasto', between(15000, 25000), 'Farmacity', C.Salud, 'a1');
    if (back === 2) add(at(18), 'gasto', between(60000, 90000), 'Curso de inglés', C['Educación'], 'a1');
  }
  add(addDays(today, -1), 'gasto', 1850000, 'Uber', C.Transporte, 'a2');

  const nextDay = (day) => { let d = today.slice(0, 8) + pad(day); if (d < today) d = addMonths(d, 1); return d; };
  const group = uid();
  const pendings = [
    { id: uid(), name: 'Alquiler', kind: 'pagar', amount: 45000000, categoryId: C.Casa, accountId: 'a1', due: nextDay(10), repeat: 'monthly', done: false },
    { id: uid(), name: 'Internet Telecentro', kind: 'pagar', amount: 2800000, categoryId: C.Servicios, accountId: 'a1', due: addDays(today, 3), repeat: 'monthly', done: false },
    { id: uid(), name: 'Seguro del celular', kind: 'pagar', amount: 1350000, categoryId: C.Otros, accountId: 'a1', due: addDays(today, -4), repeat: 'monthly', done: false },
    { id: uid(), name: 'Monotributo', kind: 'pagar', amount: 3720000, categoryId: C.Otros, accountId: 'a1', due: addDays(today, 12), repeat: 'monthly', done: false },
    { id: uid(), name: 'Juan me devuelve la entrada', kind: 'cobrar', amount: 4500000, categoryId: C['Otros ingresos'], accountId: 'a2', due: addDays(today, 5), repeat: 'none', done: false },
  ];
  for (let i = 4; i <= 6; i++) {
    pendings.push({ id: uid(), name: 'Zapatillas Nike', kind: 'pagar', amount: 3200000, categoryId: C.Ropa, accountId: 'a1', due: addMonths(addDays(today, 6), i - 4), repeat: 'none', done: false, group, n: i, of: 6 });
  }
  return {
    version: 1, demo: true,
    accounts, categories, txs, pendings,
    budgets: { [C.Comida]: 30000000, [C.Delivery]: 7000000, [C.Salidas]: 10000000, [C.Transporte]: 4000000, [C.Suscripciones]: 2000000 },
    goals: [
      { id: uid(), name: 'Viaje a Brasil', emoji: '🏖️', currency: 'USD', target: 100000, saved: 35000 },
      { id: uid(), name: 'Fondo de emergencia', emoji: '🛟', currency: 'ARS', target: 200000000, saved: 60000000 },
    ],
    settings: { usd: 1730, usdKind: 'blue', theme: 'auto', view: 'ARS' },
  };
}
function emptyState() {
  const base = seedDemo();
  return {
    version: 1, demo: false,
    accounts: [{ id: uid(), name: 'Brubank', emoji: '🏦', currency: 'ARS', initial: 0 }, { id: uid(), name: 'Efectivo', emoji: '💵', currency: 'ARS', initial: 0 }],
    categories: base.categories, txs: [], pendings: [], budgets: {}, goals: [],
    settings: { ...S.settings },
  };
}

/* ---------- Deshacer ---------- */
let undoSnap = null;
function snapshot() { undoSnap = clone(S); }
function undo() { if (!undoSnap) return; replaceState(undoSnap); undoSnap = null; save(); render(); toast('Listo, lo deshice'); }

function toast(msg, withUndo = false) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${withUndo ? '<button type="button">Deshacer</button>' : ''}`;
  if (withUndo) el.querySelector('button').onclick = () => { el.remove(); undo(); };
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, withUndo ? 5500 : 2600);
}

/* ---------- Íconos ---------- */
const I = {
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  ul: '<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
  paste: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3h6v2M9 11h6M9 15h4"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5l2-2.5M20 20v-5h-5"/></svg>',
  repeat: '↻',
};

/* =========================================================
   Render principal y navegación
   ========================================================= */
const VIEWS = {
  inicio: ['Inicio', renderInicio],
  movimientos: ['Movimientos', renderMovimientos],
  pendientes: ['Pendientes', renderPendientes],
  planes: ['Planes', renderPlanes],
  ajustes: ['Ajustes', renderAjustes],
};
let currentView = 'inicio';
function route() {
  const v = (location.hash || '#inicio').slice(1);
  if (v.startsWith('vincular=')) {
    const code = decodeURIComponent(v.slice(9));
    history.replaceState(null, '', '#ajustes'); currentView = 'ajustes'; render(true); linkForm(code); return;
  }
  if (v === 'nuevo') { history.replaceState(null, '', '#inicio'); currentView = 'inicio'; render(true); txForm(); return; }
  currentView = VIEWS[v] ? v : 'inicio';
  render(true);
}
function render(animate = false) {
  const [title, fn] = VIEWS[currentView];
  $('#viewTitle').textContent = title;
  const d = new Date();
  const ds = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#viewDate').textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === currentView));
  $$('[data-action="view-cur"]').forEach((b) => b.classList.toggle('on', b.dataset.cur === S.settings.view));
  $('#demoBanner').hidden = !S.demo;
  const bar = $('#spaceBar');
  bar.hidden = !multiSpace() || currentView === 'ajustes';
  if (!bar.hidden) {
    const sp = curSpace();
    bar.innerHTML = [{ id: 'all', name: 'Todo', emoji: 'img/mundo.png' }, ...S.spaces].map((x) => `<button type="button" class="space-chip ${sp === x.id ? 'on' : ''}" data-action="set-space" data-v="${x.id}" aria-pressed="${sp === x.id}">${ico(x.emoji, 'xs')}<span>${esc(x.name)}</span></button>`).join('');
  }
  const overdue = openPendings().filter((p) => p.kind === 'pagar' && p.due <= todayISO()).length;
  const badge = $('#navBadge');
  badge.hidden = !overdue;
  badge.textContent = overdue;
  applyTheme();
  const view = $('#view');
  const scrollY = window.scrollY;
  fn(view);
  if (currentView === 'ajustes' && NATIVE) captureCard();
  if (animate) {
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    window.scrollTo(0, 0);
    countUp(view);
  } else {
    window.scrollTo(0, scrollY);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('[data-w]', view).forEach((el) => { el.style.width = el.dataset.w; });
    $$('.ring .fg', view).forEach((el) => { el.style.strokeDashoffset = el.dataset.off; });
  }));
}
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}
function countUp(root) {
  if (REDUCED) return;
  $$('[data-count]', root).forEach((el) => {
    const target = Number(el.dataset.count);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      const e = 1 - Math.pow(1 - p, 3);
      el.innerHTML = cents(show(Math.round(target * e)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* =========================================================
   INICIO
   ========================================================= */
function renderInicio(view) {
  const b = balances();
  const today = todayISO();
  const mk = monthKey(today);
  const prevMk = monthKey(addMonths(today.slice(0, 8) + '01', -1));
  const sp = curSpace();
  const space = spaceById(sp);
  const biz = isBiz(sp);
  const st = monthStats(mk);
  const prev = monthStats(prevMk);
  const accts = visAccounts();
  const sumBal = (list) => list.reduce((s, a) => s + toARS(b[a.id], a.currency), 0);
  const total = sumBal(accts);
  const eom = endOfMonth(today);
  const pend = visPendings().filter((p) => p.due <= eom);
  const toPay = pend.filter((p) => p.kind === 'pagar').reduce((s, p) => s + pARS(p), 0);
  const toGet = pend.filter((p) => p.kind === 'cobrar').reduce((s, p) => s + pARS(p), 0);
  const available = total - toPay + toGet;
  const dayN = parseISO(today).getDate();
  const dim = parseISO(eom).getDate();
  const projected = Math.round((st.expense / Math.max(1, dayN)) * dim);

  const upcoming = visPendings().sort((a, c) => a.due.localeCompare(c.due)).slice(0, 5);
  const recent = S.txs.filter((t) => txInSpace(t)).sort((a, c) => c.date.localeCompare(a.date) || 0).slice(0, 5);

  // Un solo aviso, el más importante. Si hay plan de ahorro y falta apartar, ese primero.
  const pl = !biz && planInfo();
  const tip = pl && pl.rate && pl.target > pl.saved && pl.income > 0
    ? ['img/chanchito.png', `Tu plan: este mes te falta apartar <b>${show(pl.target - pl.saved)}</b>. <a href="#planes">Apartar</a>`]
    : insights(st, prev, projected).find((x) => x[0] !== 'img/brillos.png');

  const chips = biz
    ? [['Vendiste / entró', st.income], ['Gastaste', st.expense], [st.net >= 0 ? 'Ganancia del mes' : 'Pérdida del mes', Math.abs(st.net)]]
    : [['Entró este mes', st.income], ['Gastaste este mes', st.expense], ['Falta pagar', toPay]];

  const accTile = (a) => `
    <div class="acc-cell">
      <button type="button" class="acc ${b[a.id] < 0 ? 'neg' : ''}" data-action="filter-account" data-id="${a.id}" title="Ver movimientos de ${esc(a.name)}">
        <div class="top">${ico(a.emoji)}<span>${esc(a.name)}</span></div>
        <div class="bal num">${cents(fmt(b[a.id], a.currency))}</div>
        <div class="cur">${a.currency === 'USD' ? `≈ ${fmt(toARS(b[a.id], 'USD'), 'ARS', true)}` : 'Pesos'}</div>
      </button>
      <button type="button" class="acc-edit" data-action="edit-account" data-id="${a.id}" aria-label="Editar o eliminar ${esc(a.name)}" title="Editar o eliminar">${I.edit}</button>
    </div>`;
  // En "Todo junto" las cuentas se ven separadas por espacio, cada uno con su total
  const accBlock = sp === 'all' && multiSpace()
    ? S.spaces.map((s) => {
      const list = visAccounts(s.id);
      if (!list.length) return '';
      return `<button type="button" class="acc-group" data-action="set-space" data-v="${s.id}">${ico(s.emoji, 'xs')}<span>${esc(s.name)}</span><b class="num">${cents(show(sumBal(list)))}</b></button>
        <div class="accounts-row">${list.map(accTile).join('')}</div>`;
    }).join('')
    : `<div class="accounts-row">${accts.map(accTile).join('') || '<p class="empty">Agregá la primera cuenta de este espacio.</p>'}</div>`;

  const lastMk = prevMk;
  const showSummary = dayN <= 10 && S.ui.seenSummary !== lastMk && S.txs.some((t) => monthKey(t.date) === lastMk);
  view.innerHTML = `
  <div class="grid dash">
    ${showSummary ? `<button type="button" class="card sum-ready span-3" data-action="summary" data-mk="${lastMk}">${ico('img/grafico.png', 'sm')}<span><b>Tu resumen de ${monthLabel(lastMk, true)} está listo</b><small>Cuánto entró, cuánto gastaste, cuánto ahorraste y en qué se fue</small></span><span class="go">Ver ›</span></button>` : ''}
    <section class="card hero span-3 ${biz ? 'biz' : ''}">
      <p class="label">${sp === 'all' ? 'Tenés en total' : `Tenés en ${esc(space.name)}`}</p>
      <p class="big num" data-count="${total}">${cents(show(total))}</p>
      <p class="avail">Libre después de pagar lo del mes: <b class="num">${cents(show(available))}</b>
        <button type="button" class="info-btn" data-action="explain-available" aria-label="¿Cómo se calcula?">?</button></p>
      <div class="hero-chips">
        ${chips.map(([l, v]) => `<div class="hero-chip">${l}<b class="num">${cents(show(v))}</b></div>`).join('')}
      </div>
      <div class="hero-btns">
        <button type="button" class="hero-btn" data-action="sync-balance">${I.sync}Poner al día mis saldos</button>
        ${biz ? `<button type="button" class="hero-btn ghost" data-action="pay-owner">${ico('img/maletin.png', 'xs')}Pagarme el sueldo</button>` : ''}
      </div>
      ${biz && st.ownerPaid ? `<p class="hero-tip">${ico('img/billete.png', 'xs')}<span>Este mes te pagaste <b>${show(st.ownerPaid)}</b> de sueldo.</span></p>` : ''}
      ${tip ? `<p class="hero-tip">${ico(tip[0], 'xs')}<span>${tip[1]}</span></p>` : ''}
    </section>

    <section class="card span-3">
      <div class="card-head"><h2>Cuentas</h2><button type="button" class="link-btn" data-action="new-account">+ Agregar</button></div>
      ${accBlock}
    </section>

    <section class="card">
      <div class="card-head"><h2>Para pagar</h2><a class="link-btn" href="#pendientes">Ver todo</a></div>
      <div class="list">${upcoming.length ? upcoming.map(pendingRow).join('') : emptyBox('fiesta', 'No tenés pagos pendientes.')}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Últimos movimientos</h2><a class="link-btn" href="#movimientos">Ver todo</a></div>
      <div class="list">${recent.length ? recent.map(txRow).join('') : emptyBox('recibo', 'Todavía no cargaste movimientos.')}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>¿En qué gastás?</h2><span class="sub">${monthLabel(mk, true)}</span></div>
      ${catBars(st.byCat)}
    </section>

    ${recent.length ? `<section class="card span-3">
      <div class="card-head"><h2>Últimos 6 meses</h2>
        <button type="button" class="link-btn push" data-action="summary" data-mk="${mk}">Resumen del mes</button>
        <button type="button" class="link-btn" data-action="toggle-table">${S.ui.table ? 'Ver gráfico' : 'Ver tabla'}</button></div>
      <div id="monthlyChart" class="chart"></div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>Entró</span><span><i style="background:var(--series-2)"></i>Gastaste</span></div>
    </section>` : ''}
  </div>`;
  drawMonthly($('#monthlyChart'));
}

function emptyBox(key, text) { return `<div class="empty"><img class="big-img" src="img/${key}.png" alt="">${esc(text)}</div>`; }

function catBars(byCat) {
  const entries = Object.entries(byCat).filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]);
  if (!entries.length) return emptyBox('grafico', 'Sin gastos este mes.');
  const top = entries.slice(0, 7);
  const rest = entries.slice(7).reduce((s, e) => s + e[1], 0);
  if (rest) top.push(['__otros', rest]);
  const total = entries.reduce((s, e) => s + e[1], 0);
  const max = Math.max(...top.map(([id, v]) => Math.max(v, S.budgets[id] || 0)));
  return `<div class="catbars">${top.map(([id, v]) => {
    const c = id === '__otros' ? { name: 'Resto', emoji: 'img/bolsas.png' } : (cat(id) || { name: 'Sin categoría', emoji: 'img/pregunta.png' });
    const bud = S.budgets[id];
    const tip = `${c.name}|Gastado: ${show(v)}|${Math.round((v / total) * 100)}% del total${bud ? `|Presupuesto: ${show(bud)}` : ''}`;
    return `<button type="button" class="catbar" data-tip="${esc(tip)}" ${id !== '__otros' ? `data-action="filter-cat" data-id="${id}"` : ''}>
      <span class="lbl">${ico(c.emoji, 'xs')}<span>${esc(c.name)}</span></span>
      <span class="track"><span class="fill" data-w="${((v / max) * 100).toFixed(1)}%" style="display:block"></span>${bud ? `<span class="bmark" style="left:calc(${((bud / max) * 100).toFixed(1)}% - 1px)"></span>` : ''}</span>
      <span class="val num">${fmtShort(S.settings.view === 'USD' ? v / S.settings.usd : v)}</span>
    </button>`;
  }).join('')}</div>
  ${Object.keys(S.budgets).length ? '<div class="legend"><span><i class="mark"></i>Presupuesto del mes</span></div>' : ''}`;
}

function insights(st, prev, projected) {
  const out = [];
  const overdue = visPendings().filter((p) => p.kind === 'pagar' && p.due < todayISO());
  if (overdue.length) out.push(['img/alerta.png', `Tenés <b>${overdue.length} pago${overdue.length > 1 ? 's' : ''} vencido${overdue.length > 1 ? 's' : ''}</b>: ${overdue.map((p) => esc(p.name)).join(', ')}.`]);
  const ents = Object.entries(st.byCat).sort((a, c) => c[1] - a[1]);
  if (ents.length) {
    const [id, v] = ents[0];
    const c = cat(id);
    if (c) out.push([c.emoji, `Tu mayor gasto es <b>${esc(c.name)}</b>: ${show(v)} (${Math.round((v / st.expense) * 100)}% del mes).`]);
  }
  let worst = null;
  for (const [id, v] of ents) {
    const p = prev.byCat[id] || 0;
    if (p > 0 && v > p * 1.15 && (!worst || v - p > worst[1])) worst = [id, v - p, Math.round(((v - p) / p) * 100)];
  }
  if (worst && cat(worst[0])) out.push(['img/grafico.png', `En <b>${esc(cat(worst[0]).name)}</b> ya gastaste ${worst[2]}% más que todo el mes pasado.`]);
  const over = Object.entries(S.budgets).filter(([id, lim]) => (st.byCat[id] || 0) > lim && cat(id));
  if (over.length) out.push(['img/campana.png', `Te pasaste del presupuesto en <b>${over.map(([id]) => esc(cat(id).name)).join(', ')}</b>.`]);
  const day = parseISO(todayISO()).getDate();
  if (st.expense) out.push(['img/calendario.png', `Gastás en promedio <b>${show(Math.round(st.expense / day))}</b> por día.`]);
  if (st.income && projected < st.income) out.push(['img/biceps.png', `A este ritmo te sobrarían <b>${show(st.income - projected)}</b> a fin de mes.`]);
  if (!out.length) out.push(['img/brillos.png', 'Cargá algunos movimientos y acá vas a ver consejos sobre tus gastos.']);
  return out.slice(0, 4);
}

/* Gráfico de barras agrupadas: últimos 6 meses */
function drawMonthly(el) {
  if (!el) return;
  const today = todayISO();
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(addMonths(today.slice(0, 8) + '01', -i)));
  const data = months.map((mk) => ({ mk, ...monthStats(mk) }));
  const conv = (v) => (S.settings.view === 'USD' ? v / S.settings.usd : v);
  if (S.ui.table) {
    el.innerHTML = `<table class="tbl num"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Resultado</th></tr></thead><tbody>
      ${data.map((d) => `<tr><td>${monthLabel(d.mk, true)}</td><td>${show(d.income)}</td><td>${show(d.expense)}</td><td class="${d.net >= 0 ? 'amt in' : 'amt'}">${show(d.net)}</td></tr>`).join('')}
    </tbody></table>`;
    return;
  }
  const W = Math.max(280, el.clientWidth || 600);
  const H = 220, pl = 44, pr = 6, pt = 10, pb = 26;
  const iw = W - pl - pr, ih = H - pt - pb;
  const maxV = Math.max(1, ...data.map((d) => Math.max(conv(d.income), conv(d.expense))));
  const nice = niceMax(maxV);
  const y = (v) => pt + ih - (conv(v) / nice) * ih;
  const gw = iw / data.length;
  const bw = Math.min(26, (gw - 14) / 2);
  const ticks = [0, .25, .5, .75, 1].map((f) => f * nice);
  const bar = (x, v, cls, delay) => {
    const top = y(v), h = pt + ih - top;
    if (h <= 0.5) return '';
    const r = Math.min(4, h, bw / 2);
    return `<path class="${cls} grow" style="animation-delay:${delay}ms" d="M${x},${pt + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pt + ih} Z"/>`;
  };
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">
    ${ticks.map((t) => `<line class="gridline" x1="${pl}" x2="${W - pr}" y1="${pt + ih - (t / nice) * ih}" y2="${pt + ih - (t / nice) * ih}"/>
      <text class="axis-text" x="${pl - 8}" y="${pt + ih - (t / nice) * ih + 4}" text-anchor="end">${fmtShort(t)}</text>`).join('')}
    ${data.map((d, i) => {
      const cx = pl + gw * i + gw / 2;
      return `${bar(cx - bw - 1, d.income, 'bar-in', i * 50)}${bar(cx + 1, d.expense, 'bar-out', i * 50 + 25)}
        <text class="axis-text" x="${cx}" y="${H - 6}" text-anchor="middle">${monthLabel(d.mk)}</text>
        <rect class="hit" x="${pl + gw * i}" y="${pt}" width="${gw}" height="${ih}" rx="6" data-i="${i}"/>`;
    }).join('')}
    <line class="baseline" x1="${pl}" x2="${W - pr}" y1="${pt + ih}" y2="${pt + ih}"/>
  </svg>`;
  $$('.hit', el).forEach((r) => {
    const d = data[Number(r.dataset.i)];
    const html = `<div class="t">${monthLabel(d.mk, true)}</div>
      <div class="r"><span><i style="background:var(--series-1)"></i>Ingresos</span><b class="num">${show(d.income)}</b></div>
      <div class="r"><span><i style="background:var(--series-2)"></i>Gastos</span><b class="num">${show(d.expense)}</b></div>
      <div class="r"><span>Resultado</span><b class="num">${show(d.net)}</b></div>`;
    r.addEventListener('pointerenter', (e) => showTip(html, e));
    r.addEventListener('pointermove', moveTip);
    r.addEventListener('pointerleave', hideTip);
  });
}
function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/* Tooltip */
const tipEl = () => $('#tooltip');
function showTip(html, e) { const t = tipEl(); t.innerHTML = html; t.hidden = false; moveTip(e); }
function moveTip(e) {
  const t = tipEl();
  const r = t.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  t.style.left = Math.max(8, x) + 'px';
  t.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tipEl().hidden = true; }
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  const parts = el.dataset.tip.split('|');
  showTip(`<div class="t">${esc(parts[0])}</div>${parts.slice(1).map((p) => `<div class="r"><span>${esc(p)}</span></div>`).join('')}`, e);
  const move = (ev) => moveTip(ev);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', () => { hideTip(); el.removeEventListener('pointermove', move); }, { once: true });
});

/* Filas reutilizables */
function txRow(t) {
  const c = catOf(t);
  const cur = txCur(t);
  let cls = 'out', sign = '−', meta = `${esc(c.name)} · ${esc(accName(t.accountId))}`;
  if (t.type === 'ingreso') { cls = 'in'; sign = '+'; }
  if (t.type === 'transferencia') { cls = 'adj'; sign = ''; meta = `${t.ownerPay ? 'Sueldo · ' : ''}${esc(accName(t.accountId))} → ${esc(accName(t.toAccountId))}`; }
  if (t.auto) meta = `⚡ ${meta}`;
  if (t.type === 'ajuste') { cls = 'adj'; sign = t.amount >= 0 ? '+' : '−'; }
  return `<button type="button" class="row" data-action="edit-tx" data-id="${t.id}">
    ${ico(t.ownerPay ? 'img/maletin.png' : (t.type === 'gasto' || t.type === 'ingreso') && findLogo(t.desc) || c.emoji)}
    <span class="main-col"><span class="title">${esc(t.desc || c.name)}</span><span class="meta">${meta} · ${shortDate(t.date)}</span></span>
    <span class="amt num ${cls}">${sign}${fmt(Math.abs(t.amount), cur)}${cur === 'USD' ? `<small>≈ ${fmt(toARS(Math.abs(t.amount), 'USD'), 'ARS', true)}</small>` : ''}</span>
  </button>`;
}
function dueTag(p) {
  const d = daysBetween(todayISO(), p.due);
  if (p.done) return `<span class="tag good">Hecho</span>`;
  if (d < 0) return `<span class="tag danger">⚠ Venció hace ${-d} día${d === -1 ? '' : 's'}</span>`;
  if (d === 0) return `<span class="tag warn">● Vence hoy</span>`;
  if (d <= 3) return `<span class="tag warn">En ${d} día${d === 1 ? '' : 's'}</span>`;
  return `<span class="tag">${shortDate(p.due)}</span>`;
}
function pendingRowSimple(p) {
  const c = cat(p.categoryId) || { emoji: p.kind === 'cobrar' ? 'img/apreton.png' : 'img/recibo.png' };
  const cur = pCur(p);
  return `<button type="button" class="row" data-action="edit-pending" data-id="${p.id}">
    ${ico(findLogo(p.name) || c.emoji)}
    <span class="main-col"><span class="title">${esc(p.name)}${p.of ? ` <span class="tag accent">${p.n}/${p.of}</span>` : ''}</span><span class="meta">${dueTag(p)}</span></span>
    <span class="amt num ${p.kind === 'cobrar' ? 'in' : 'out'}">${p.kind === 'cobrar' ? '+' : ''}${fmt(p.amount, cur)}</span>
  </button>`;
}

/* =========================================================
   MOVIMIENTOS
   ========================================================= */
function renderMovimientos(view) {
  const u = S.ui;
  const advanced = (u.account !== 'all') + (u.cat !== 'all') + (u.sort !== 'date-desc') + (u.group !== 'day');
  const open = u.more || advanced > 0;
  view.innerHTML = `
  <div class="toolbar">
    <label class="search">${I.search}<input id="q" type="search" placeholder="Buscar…" value="${esc(u.q)}" aria-label="Buscar"></label>
    <div class="chips" role="group" aria-label="Tipo">
      ${[['all', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['transferencia', 'Transferencias']].map(([k, l]) => `<button type="button" class="chip ${u.type === k ? 'on' : ''}" data-action="f-type" data-v="${k}">${l}</button>`).join('')}
    </div>
    <select class="select" id="fPeriod" aria-label="Período">
      ${[['month', 'Este mes'], ['prev', 'Mes pasado'], ['3m', 'Últimos 3 meses'], ['year', 'Este año'], ['all', 'Todo']].map(([k, l]) => `<option value="${k}" ${u.period === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <button type="button" class="btn small ${open ? 'on' : ''}" data-action="more-filters" aria-expanded="${open}">Más filtros${advanced ? ` (${advanced})` : ''}</button>
  </div>
  <div class="toolbar more" ${open ? '' : 'hidden'}>
    <select class="select" id="fAccount" aria-label="Cuenta">
      <option value="all">Todas las cuentas</option>
      ${visAccounts().map((a) => `<option value="${a.id}" ${u.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
    </select>
    <select class="select" id="fCat" aria-label="Categoría">
      <option value="all">Todas las categorías</option>
      ${S.categories.map((c) => `<option value="${c.id}" ${u.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>
    <select class="select" id="fSort" aria-label="Ordenar">
      ${[['date-desc', 'Más recientes'], ['date-asc', 'Más antiguos'], ['amt-desc', 'Mayor monto'], ['amt-asc', 'Menor monto'], ['cat', 'Categoría A-Z'], ['desc', 'Descripción A-Z'], ['acc', 'Cuenta A-Z']].map(([k, l]) => `<option value="${k}" ${u.sort === k ? 'selected' : ''}>Orden: ${l}</option>`).join('')}
    </select>
    <select class="select" id="fGroup" aria-label="Agrupar">
      ${[['day', 'Por día'], ['cat', 'Por categoría'], ['acc', 'Por cuenta'], ['month', 'Por mes'], ['none', 'Sin agrupar']].map(([k, l]) => `<option value="${k}" ${u.group === k ? 'selected' : ''}>Agrupar: ${l}</option>`).join('')}
    </select>
  </div>
  <div id="txSummary"></div>
  <div class="card"><div id="txList" class="list"></div></div>`;

  const q = $('#q', view);
  let tm;
  q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { S.ui.q = q.value; save(); updateTxList(); }, 120); });
  [['#fPeriod', 'period'], ['#fAccount', 'account'], ['#fCat', 'cat'], ['#fSort', 'sort'], ['#fGroup', 'group']].forEach(([sel, key]) => {
    $(sel, view).addEventListener('change', (e) => { S.ui[key] = e.target.value; save(); updateTxList(); });
  });
  updateTxList();
}

function filteredTxs() {
  const u = S.ui;
  const today = todayISO();
  const mk = monthKey(today);
  let from = '0000', to = '9999';
  if (u.period === 'month') { from = mk + '-01'; to = mk + '-31'; }
  if (u.period === 'prev') { const p = monthKey(addMonths(mk + '-01', -1)); from = p + '-01'; to = p + '-31'; }
  if (u.period === '3m') { from = addMonths(mk + '-01', -2); }
  if (u.period === 'year') { from = today.slice(0, 4) + '-01-01'; to = today.slice(0, 4) + '-12-31'; }
  const qn = norm(u.q);
  const qDigits = u.q.replace(/\D/g, '');
  let list = S.txs.filter((t) => {
    if (t.date < from || t.date > to || !txInSpace(t)) return false;
    if (u.type !== 'all' && t.type !== u.type) return false;
    if (u.account !== 'all' && t.accountId !== u.account && t.toAccountId !== u.account) return false;
    if (u.cat !== 'all' && t.categoryId !== u.cat) return false;
    if (qn) {
      const hay = norm(`${t.desc} ${catOf(t).name} ${accName(t.accountId)} ${t.note || ''}`);
      const amountHit = qDigits.length >= 2 && String(Math.floor(Math.abs(t.amount) / 100)).includes(qDigits);
      if (!hay.includes(qn) && !amountHit) return false;
    }
    return true;
  });
  const val = (t) => toARS(Math.abs(t.amount), txCur(t));
  const sorters = {
    'date-desc': (a, b) => b.date.localeCompare(a.date),
    'date-asc': (a, b) => a.date.localeCompare(b.date),
    'amt-desc': (a, b) => val(b) - val(a),
    'amt-asc': (a, b) => val(a) - val(b),
    cat: (a, b) => catOf(a).name.localeCompare(catOf(b).name, 'es') || b.date.localeCompare(a.date),
    desc: (a, b) => (a.desc || '').localeCompare(b.desc || '', 'es'),
    acc: (a, b) => accName(a.accountId).localeCompare(accName(b.accountId), 'es') || b.date.localeCompare(a.date),
  };
  list.sort(sorters[u.sort] || sorters['date-desc']);
  return list;
}

function updateTxList() {
  const list = filteredTxs();
  const sp = curSpace();
  const inc = list.filter((t) => t.type === 'ingreso' || (t.ownerPay && sp !== 'all' && inSpace(t.toAccountId, sp) && !inSpace(t.accountId, sp))).reduce((s, t) => s + (t.ownerPay ? toARS(t.toAmount ?? t.amount, acc(t.toAccountId)?.currency) : toARS(t.amount, txCur(t))), 0);
  const exp = list.filter((t) => t.type === 'gasto').reduce((s, t) => s + toARS(t.amount, txCur(t)), 0);
  const activeFilters = (S.ui.q ? 1 : 0) + (S.ui.type !== 'all') + (S.ui.account !== 'all') + (S.ui.cat !== 'all');
  $('#txSummary').innerHTML = `<div class="summary">
    <span>Entró <b class="num amt in">${show(inc)}</b></span>
    <span>Gastaste <b class="num">${show(exp)}</b></span>
    <span class="grow"></span>
    ${activeFilters ? '<button type="button" class="btn small" data-action="clear-filters">Limpiar filtros</button>' : ''}
    <button type="button" class="btn small" data-action="summary" data-mk="${monthKey(todayISO())}">${I.chart || ''}Resumen</button>
    <button type="button" class="btn small" data-action="export-csv">${I.dl}CSV</button>
  </div>`;
  const box = $('#txList');
  if (!list.length) { box.innerHTML = emptyBox('lupa', 'No hay movimientos con estos filtros.'); return; }
  const g = S.ui.group;
  if (g === 'none') { box.innerHTML = list.map(txRow).join(''); return; }
  const keyOf = { day: (t) => t.date, month: (t) => monthKey(t.date), cat: (t) => catOf(t).name, acc: (t) => accName(t.accountId) }[g];
  const labelOf = { day: dayLabel, month: (k) => monthLabel(k, true), cat: (k) => k, acc: (k) => k }[g];
  const groups = new Map();
  list.forEach((t) => { const k = keyOf(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  box.innerHTML = [...groups].map(([k, items]) => {
    const net = items.reduce((s, t) => s + (t.type === 'ingreso' ? 1 : t.type === 'gasto' ? -1 : 0) * toARS(t.amount, txCur(t)), 0);
    return `<div class="group-title"><span>${esc(labelOf(k))}</span><span class="num">${show(net)}</span></div>${items.map(txRow).join('')}`;
  }).join('');
}

/* =========================================================
   PENDIENTES
   ========================================================= */
function renderPendientes(view) {
  const u = S.ui;
  const today = todayISO();
  const eom = endOfMonth(today);
  const open = visPendings();
  const biz = isBiz();
  const sumCur = (arr) => arr.reduce((s, p) => s + pARS(p), 0);
  const payMonth = sumCur(open.filter((p) => p.kind === 'pagar' && p.due <= eom));
  const getMonth = sumCur(open.filter((p) => p.kind === 'cobrar' && p.due <= eom));
  if (!['pagar', 'cobrar', 'hechos'].includes(u.ptab)) u.ptab = 'pagar';

  let list = u.ptab === 'hechos' ? S.pendings.filter((p) => p.done && inSpace(p.accountId)) : open.filter((p) => p.kind === u.ptab);
  if (u.ptab === 'hechos') list = list.sort((a, b) => (b.doneAt || b.due).localeCompare(a.doneAt || a.due)).slice(0, 60);
  else list.sort((a, b) => a.due.localeCompare(b.due));

  const bucket = (p) => {
    if (u.ptab === 'hechos') return '';
    const d = daysBetween(today, p.due);
    if (d < 0) return 'Vencidos';
    if (d <= 7) return 'Esta semana';
    if (p.due <= eom) return 'Resto del mes';
    return 'Más adelante';
  };
  const groups = new Map();
  list.forEach((p) => { const k = bucket(p); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });

  view.innerHTML = `
  <section class="card pend-head">
    <div class="pend-sum">
      <div><span>Falta pagar este mes</span><b class="num">${cents(show(payMonth))}</b></div>
      <div><span>Falta cobrar</span><b class="num amt in">${cents(show(getMonth))}</b></div>
    </div>
    <div class="quick-add">
      <button type="button" class="qa" data-action="new-pending">${ico('img/recibo.png', 'sm')}<span>Pago fijo<small>luz, alquiler, Netflix…</small></span></button>
      <button type="button" class="qa" data-action="new-pending" data-preset="dolar">${ico('img/dolar.png', 'sm')}<span>Pago en dólares<small>Duolingo, Spotify, iCloud…</small></span></button>
      <button type="button" class="qa" data-action="new-pending" data-preset="sueldo">${ico('img/billete.png', 'sm')}<span>${biz ? 'Cobro fijo<small>un cliente que te paga por mes</small>' : 'Sueldo o ingreso<small>lo que cobrás cada mes</small>'}</span></button>
      <button type="button" class="qa" data-action="new-pending" data-cuotas="1">${ico('img/tarjeta.png', 'sm')}<span>Compra en cuotas<small>se agenda cada cuota</small></span></button>
    </div>
  </section>
  <div class="toolbar">
    <div class="chips" role="group" aria-label="Qué ver">
      ${[['pagar', 'A pagar'], ['cobrar', 'A cobrar'], ['hechos', 'Ya hechos']].map(([k, l]) => `<button type="button" class="chip ${u.ptab === k ? 'on' : ''}" data-action="p-tab" data-v="${k}">${l}</button>`).join('')}
    </div>
  </div>
  <div class="card">
    ${list.length ? [...groups].map(([k, items]) => `${k ? `<div class="group-title"><span>${k}</span><span class="num">${show(sumCur(items))}</span></div>` : ''}${items.map(pendingRow).join('')}`).join('')
      : emptyBox(u.ptab === 'cobrar' ? 'apreton' : 'trofeo', u.ptab === 'hechos' ? 'Todavía no marcaste nada como pagado.' : u.ptab === 'cobrar' ? 'Agregá tu sueldo para verlo acá.' : 'No tenés nada para pagar.')}
    ${list.length && u.ptab !== 'hechos' ? '<p class="hint-line">Tocá el círculo cuando lo pagues o lo cobres: se anota solo.</p>' : ''}
  </div>`;
}
function pendingRow(p) {
  const c = cat(p.categoryId) || { emoji: p.kind === 'cobrar' ? 'img/apreton.png' : 'img/recibo.png' };
  const cur = pCur(p);
  const e = pendEst(p);
  const rep = { monthly: 'Mensual', weekly: 'Semanal', yearly: 'Anual' }[p.repeat];
  const accCur = acc(p.accountId)?.currency || cur;
  const amt = p.done && p.paidAmount != null ? fmt(p.paidAmount, accCur)
    : fmt(p.amount, cur) + (e.cur !== cur ? `<small>≈ ${fmt(e.amount, e.cur, true)}</small>` : '');
  return `<div class="prow" data-pid="${p.id}">
    <button type="button" class="check ${p.done ? 'done' : ''}" data-action="${p.done ? 'reopen-pending' : 'pay-pending'}" data-id="${p.id}" aria-label="${p.done ? 'Marcar como pendiente' : p.kind === 'cobrar' ? 'Marcar como cobrado' : 'Marcar como pagado'}">${I.check}</button>
    <button type="button" class="row" data-action="edit-pending" data-id="${p.id}">
      ${ico(findLogo(p.name) || c.emoji)}
      <span class="main-col">
        <span class="title">${esc(p.name)}</span>
        <span class="meta">${dueTag(p)} ${p.of ? `<span class="tag accent">Cuota ${p.n}/${p.of}</span>` : ''} ${rep ? `<span class="tag">${I.repeat} ${rep}</span>` : ''}${p.variable && !p.done ? ' <span class="tag">Monto variable</span>' : ''}</span>
      </span>
      <span class="amt num stack ${p.kind === 'cobrar' ? 'in' : 'out'}">${amt}</span>
    </button>
  </div>`;
}
/* Marcar como pagado/cobrado. Si el monto puede cambiar (o está en dólares), primero pregunta cuánto fue. */
function payPending(id, o = null) {
  const p = S.pendings.find((x) => x.id === id);
  if (!p || p.done) return;
  if (!o && needsAsk(p)) { payDialog(p); return; }
  o = o || {};
  snapshot();
  const amount = o.amount ?? p.amount;
  const tx = { id: uid(), date: o.date || todayISO(), type: p.kind === 'cobrar' ? 'ingreso' : 'gasto', amount, desc: p.of ? `${p.name} (cuota ${p.n}/${p.of})` : p.name, categoryId: p.categoryId, accountId: o.accountId || p.accountId, fromPending: p.id };
  if (pCur(p) !== txCur(tx)) tx.note = `${fmt(p.amount, pCur(p))} (con impuestos)`;
  S.txs.push(tx);
  p.done = true;
  p.doneAt = todayISO();
  p.txId = tx.id;
  p.paidAmount = amount;
  const step = { monthly: (d) => addMonths(d, 1), weekly: (d) => addDays(d, 7), yearly: (d) => addMonths(d, 12) }[p.repeat];
  if (step) {
    const next = { ...clone(p), id: uid(), due: step(p.due), done: false, doneAt: null, txId: null };
    delete next.paidAmount;
    if (o.updateNext) next.amount = amount;
    S.pendings.push(next);
  }
  save();
  const row = $(`.prow[data-pid="${id}"]`);
  const finish = () => {
    render(); toast(`${p.kind === 'cobrar' ? 'Cobrado' : 'Pagado'}: ${p.name} · ${fmt(amount, txCur(tx))}`, true);
    // Plan de ahorro: apenas entra la plata, ofrecer apartar el % elegido
    if (p.kind === 'cobrar' && S.plan?.rate && spaceOf(acc(tx.accountId)) === 'personal') {
      setTimeout(() => apartarForm({ suggest: Math.round((toARS(amount, txCur(tx)) * S.plan.rate) / 100), title: '¿Apartás tu ahorro?', intro: `Entraron <b>${fmt(amount, txCur(tx))}</b>. Tu plan dice apartar el <b>${S.plan.rate}%</b> primero, antes de gastar.` }), 500);
    }
  };
  if (row && !REDUCED) { row.querySelector('.check').classList.add('done'); row.classList.add('leaving'); setTimeout(finish, 330); } else finish();
}
function payDialog(p) {
  const e = pendEst(p);
  const a = acc(p.accountId);
  const isIn = p.kind === 'cobrar';
  const foreign = pCur(p) !== e.cur;
  openModal({
    title: isIn ? '¿Cuánto cobraste?' : '¿Cuánto te cobraron?',
    body: `
      <p class="prose" style="margin-bottom:12px"><b>${esc(p.name)}</b>${foreign
        ? ` cuesta ${fmt(p.amount, pCur(p))}. Con impuestos sale más o menos <b>${fmt(e.amount, e.cur)}</b> (dólar tarjeta a ${fmt(Math.round(cardRate() * 100))}). Poné lo que te figura en ${esc(a?.name || 'la cuenta')}.`
        : '. Si esta vez fue otro monto, cambialo.'}</p>
      <label class="amount-input"><span class="cur">${e.cur === 'USD' ? 'US$' : '$'}</span><input name="amount" inputmode="decimal" required autofocus value="${(e.amount / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}" aria-label="Monto"></label>
      <div class="fields-2">
        <label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${todayISO()}" required></label>
        <label class="field"><span>${isIn ? 'Entró en' : 'Salió de'}</span><select class="select" name="accountId">${optAccounts(p.accountId, e.cur)}</select></label>
      </div>
      ${!foreign && p.repeat !== 'none' ? '<label class="check-line"><input type="checkbox" name="next"><span>Usar este monto para los próximos</span></label>' : ''}`,
    submit: isIn ? 'Listo, cobrado' : 'Listo, pagado',
    onSubmit: (fd) => {
      const amount = parseMoney(fd.get('amount'));
      if (!(amount > 0)) { toast('Escribí el monto'); return false; }
      setTimeout(() => payPending(p.id, { amount, date: fd.get('date') || todayISO(), accountId: fd.get('accountId'), updateNext: fd.get('next') === 'on' }), 0);
    },
  });
}

/* =========================================================
   PLANES: presupuestos y metas
   ========================================================= */
/* ---------- Plan de ahorro: apartar un % de lo que entra, apenas entra ---------- */
const monthsBetween = (a, b) => { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (by * 12 + bm) - (ay * 12 + am); };
/** Números del plan. Se calcula con la plata personal (las ventas de un negocio no son tu sueldo). */
function planInfo() {
  const rate = S.plan?.rate || 0;
  const mk = monthKey(todayISO());
  const now = monthStats(mk, 'personal');
  const past = [1, 2, 3].map((i) => monthStats(monthKey(addMonths(mk + '-01', -i)), 'personal'));
  const avg = (key) => { const l = past.filter((m) => m[key] > 0); return l.length ? Math.round(l.reduce((s, m) => s + m[key], 0) / l.length) : now[key]; };
  const avgIncome = avg('income');
  const avgExpense = avg('expense');
  const base = now.income > 0 ? now.income : avgIncome;
  const saved = S.goals.reduce((s, g) => s + (g.log || []).filter((l) => monthKey(l.d) === mk).reduce((x, l) => x + toARS(l.a, g.currency), 0), 0);
  return { rate, income: now.income, avgIncome, avgExpense, base, thisMonth: now.income > 0, target: Math.round((base * rate) / 100), saved: Math.max(0, saved) };
}
function goalNeed(g) {
  const left = g.target - g.saved;
  if (left <= 0) return '¡Meta cumplida! 🎉';
  if (!g.date) return `Te faltan ${fmt(left, g.currency, true)}`;
  const months = monthsBetween(monthKey(todayISO()), g.date) + 1;
  if (months <= 0) return `Te faltan ${fmt(left, g.currency, true)} · la fecha ya pasó`;
  return `Para ${monthLabel(g.date, true)}: <b>${fmt(Math.ceil(left / months), g.currency, true)} por mes</b>`;
}

function planCard() {
  const pl = planInfo();
  const RATES = [[10, 'Tranqui'], [20, 'Recomendado'], [30, 'A fondo']];
  const hasEmergency = S.goals.some((g) => /emergencia/i.test(g.name));
  const emergency = hasEmergency || !pl.avgExpense ? '' : `
    <div class="plan-tip">${ico('img/salvavidas.png', 'sm')}
      <div class="main-col"><b>Primero, un fondo de emergencia</b><span>Lo ideal es tener 3 meses de gastos guardados (≈ ${show(pl.avgExpense * 3, true)}) por si pasa algo.</span></div>
      <button type="button" class="btn small" data-action="goal-emergency">Crear</button>
    </div>`;
  if (!pl.rate) {
    return `<section class="card plan">
      <div class="card-head"><h2 class="h-ico">${ico('img/chanchito.png', 'sm')}Tu plan de ahorro</h2></div>
      <p class="prose">La regla es simple: <b>cada vez que cobrás, primero apartás un porcentaje</b> y después gastás. Elegí cuánto:</p>
      <div class="rate-pick">
        ${RATES.map(([r, l]) => `<button type="button" class="rate ${r === 20 ? 'rec' : ''}" data-action="plan-set" data-v="${r}">
          <b>${r}%</b><span>${l}</span>${pl.base ? `<small class="num">≈ ${show(Math.round((pl.base * r) / 100), true)} por mes</small>` : ''}</button>`).join('')}
      </div>
      ${emergency}
    </section>`;
  }
  const pct = pl.target ? Math.min(100, (pl.saved / pl.target) * 100) : 0;
  const done = pl.target > 0 && pl.saved >= pl.target;
  return `<section class="card plan">
    <div class="card-head"><h2 class="h-ico">${ico('img/chanchito.png', 'sm')}Tu plan de ahorro · ${pl.rate}%</h2><button type="button" class="link-btn" data-action="plan-rate">Cambiar</button></div>
    <div class="plan-nums">
      <div><span>Este mes apartá</span><b class="num">${cents(show(pl.target))}</b>
        <small>${pl.base ? `${pl.rate}% de ${show(pl.base, true)} ${pl.thisMonth ? 'que entró este mes' : 'que te entra por mes'}` : 'Cuando cobres te digo cuánto'}</small></div>
      <div><span>Ya apartaste</span><b class="num amt in">${cents(show(pl.saved))}</b><small>${done ? '¡Plan cumplido! 🎉' : pl.target ? `Faltan ${show(pl.target - pl.saved, true)}` : ''}</small></div>
    </div>
    <div class="meter ${done ? 'good' : ''}"><span data-w="${pct.toFixed(1)}%"></span></div>
    <div class="btn-row" style="margin-top:14px">
      <button type="button" class="btn primary small" data-action="plan-apartar">${I.plus}Apartar ahora</button>
    </div>
    ${emergency}
  </section>`;
}

function renderPlanes(view) {
  const mk = monthKey(todayISO());
  const st = monthStats(mk);
  const biz = isBiz();
  const cats = catsFor('gasto').filter((c) => !biz || c.space || S.budgets[c.id] || st.byCat[c.id]);
  const totalBudget = cats.reduce((s, c) => s + (S.budgets[c.id] || 0), 0);
  const spentInBudget = cats.reduce((s, c) => s + (S.budgets[c.id] ? st.byCat[c.id] || 0 : 0), 0);
  view.innerHTML = `
  ${biz ? '' : planCard()}
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Metas de ahorro</h2><button type="button" class="link-btn" data-action="new-goal">+ Nueva meta</button></div>
      ${S.goals.length ? S.goals.map((g) => {
        const pct = Math.min(100, (g.saved / Math.max(1, g.target)) * 100);
        const C = 2 * Math.PI * 26;
        return `<div class="goal">
          <svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C - (pct / 100) * C}"/><text x="32" y="37" text-anchor="middle">${Math.round(pct)}%</text></svg>
          <div class="main-col">
            <div class="title" style="font-weight:700">${ico(g.emoji, 'sm')} ${esc(g.name)}</div>
            <div class="nums num" style="color:var(--text-2);font-size:13.5px">${cents(fmt(g.saved, g.currency))} de ${fmt(g.target, g.currency, true)}</div>
            <div class="goal-need">${goalNeed(g)}</div>
            <div class="btn-row" style="margin-top:8px">
              <button type="button" class="btn small" data-action="goal-add" data-id="${g.id}">${I.plus}Sumar</button>
              <button type="button" class="btn small" data-action="edit-goal" data-id="${g.id}">${I.edit}Editar</button>
            </div>
          </div>
        </div>`;
      }).join('') : emptyBox('diana', 'Creá una meta: un viaje, un fondo de emergencia, una compu nueva…')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Límites de gasto · ${monthLabel(mk, true)}</h2></div>
      <p class="prose" style="margin-bottom:8px">Poné un tope por mes a lo que quieras controlar. Te aviso al llegar al 80% y si te pasás. Vacío = sin control.</p>
      ${totalBudget ? `<div class="summary"><span>Usado <b class="num">${show(spentInBudget)}</b> de <b class="num">${show(totalBudget)}</b></span></div>` : ''}
      ${cats.map((c) => {
        const lim = S.budgets[c.id] || 0;
        const spent = st.byCat[c.id] || 0;
        const pct = lim ? (spent / lim) * 100 : 0;
        const state = !lim ? '' : pct > 100 ? 'over' : pct >= 80 ? 'warn' : '';
        const tag = !lim ? '' : pct > 100 ? '<span class="tag danger">⚠ Excedido</span>' : pct >= 80 ? '<span class="tag warn">● Cerca del límite</span>' : '<span class="tag good">✓ Bien</span>';
        return `<div class="budget">
          <div class="top">
            ${ico(c.emoji)}
            <div class="main-col"><div class="title" style="font-weight:640">${esc(c.name)} ${tag}</div>
              <div class="nums num">${fmt(spent, 'ARS', true)}${lim ? ` de ${fmt(lim, 'ARS', true)} · ${Math.round(pct)}%` : ' gastado'}</div></div>
            <input class="input limit num" inputmode="decimal" placeholder="Límite" aria-label="Límite de ${esc(c.name)}" data-budget="${c.id}" value="${lim ? (lim / 100).toLocaleString('es-AR') : ''}">
          </div>
          ${lim ? `<div class="meter ${state}"><span data-w="${Math.min(100, pct).toFixed(1)}%"></span></div>` : ''}
        </div>`;
      }).join('')}
    </section>
  </div>`;
  $$('[data-budget]', view).forEach((inp) => {
    inp.addEventListener('change', () => {
      const v = parseMoney(inp.value);
      if (Number.isFinite(v) && v > 0) S.budgets[inp.dataset.budget] = v; else delete S.budgets[inp.dataset.budget];
      save(); render(); toast('Límite guardado');
    });
  });
}

function planRateForm() {
  const cur = S.plan?.rate || 0;
  const std = [10, 20, 30].includes(cur);
  openModal({
    title: 'Plan de ahorro',
    body: `
      <p class="prose" style="margin-bottom:12px">¿Qué parte de lo que te entra querés apartar cada mes?</p>
      <div class="choice">
        ${[[10, 'Tranqui', 'Para arrancar sin sufrir'], [20, 'Recomendado', 'La regla más usada'], [30, 'A fondo', 'Si querés llegar rápido a tus metas']].map(([r, l, h]) => `
          <label><input type="radio" name="rate" value="${r}" ${cur === r ? 'checked' : ''}><span><b>${r}% · ${l}</b><small>${h}</small></span></label>`).join('')}
        <label><input type="radio" name="rate" value="otro" ${cur && !std ? 'checked' : ''}><span><b>Otro</b>
          <input class="input num" name="custom" inputmode="numeric" maxlength="2" placeholder="%" value="${cur && !std ? cur : ''}" style="max-width:90px;margin-top:6px"></span></label>
        <label><input type="radio" name="rate" value="0" ${!cur ? 'checked' : ''}><span><b>Sin plan</b><small>Apagarlo por ahora</small></span></label>
      </div>`,
    onOpen: (form) => { form.custom.addEventListener('focus', () => { form.querySelector('input[value="otro"]').checked = true; }); },
    onSubmit: (fd) => {
      let r = fd.get('rate') === 'otro' ? Number(fd.get('custom')) : Number(fd.get('rate'));
      if (!(r >= 0 && r <= 90)) { toast('Poné un porcentaje entre 1 y 90'); return false; }
      S.plan = { ...S.plan, rate: Math.round(r) };
      save(); render(); toast(r ? `Plan: apartar el ${Math.round(r)}%` : 'Plan apagado');
    },
  });
}

/** Apartar plata para una meta. Sin metas, crea una llamada "Ahorro". */
function apartarForm({ goalId = '', suggest = 0, title = 'Apartar ahorro', intro = '' } = {}) {
  const goals = S.goals;
  const g0 = goals.find((g) => g.id === goalId) || goals.find((g) => /emergencia/i.test(g.name) && g.saved < g.target) || goals.find((g) => g.saved < g.target) || goals[0];
  const inCur = (g, ars) => (g?.currency === 'USD' ? Math.round(ars / S.settings.usd) : ars);
  const val = (c) => (c > 0 ? (c / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '');
  openModal({
    title,
    body: `
      ${intro ? `<p class="prose" style="margin-bottom:12px">${intro}</p>` : ''}
      <label class="amount-input"><span class="cur" id="apCur">${g0?.currency === 'USD' ? 'US$' : '$'}</span><input name="amount" inputmode="decimal" placeholder="0" required autofocus value="${val(inCur(g0, suggest))}" aria-label="Monto"></label>
      ${goals.length ? `<label class="field"><span>Para qué meta</span><select class="select" name="goal">${goals.map((g) => `<option value="${g.id}" ${g === g0 ? 'selected' : ''}>${esc(g.name)} (${g.currency === 'USD' ? 'US$' : '$'})</option>`).join('')}</select></label>`
        : '<label class="field"><span>Nombre de tu ahorro</span><input class="input" name="newGoal" value="Ahorro" maxlength="40"></label>'}
      <p class="field hint">Usá un número negativo si sacaste plata del ahorro.</p>`,
    submit: 'Apartar',
    cancel: intro ? 'Ahora no' : 'Cancelar',
    onOpen: (form) => {
      form.goal?.addEventListener('change', () => {
        const g = goals.find((x) => x.id === form.goal.value);
        $('#apCur', form).textContent = g?.currency === 'USD' ? 'US$' : '$';
        if (suggest) form.amount.value = val(inCur(g, suggest));
      });
    },
    onSubmit: (fd) => {
      const raw = String(fd.get('amount') || '');
      const v = parseMoney(raw) * (raw.trim().startsWith('-') ? -1 : 1);
      if (!Number.isFinite(v) || v === 0) { toast('Escribí un monto'); return false; }
      snapshot();
      let g = goals.find((x) => x.id === fd.get('goal'));
      if (!g) {
        g = { id: uid(), name: String(fd.get('newGoal') || 'Ahorro').trim() || 'Ahorro', emoji: 'img/chanchito.png', currency: 'ARS', target: Math.max(v * 6, 100000), saved: 0 };
        S.goals.push(g);
      }
      const before = g.saved;
      g.saved = Math.max(0, g.saved + v);
      (g.log = g.log || []).push({ d: todayISO(), a: g.saved - before });
      save(); render();
      toast(before < g.target && g.saved >= g.target ? `🎉 ¡Llegaste a tu meta “${g.name}”!` : `Apartaste ${fmt(Math.abs(v), g.currency)} para ${g.name}`, true);
    },
  });
}

/* =========================================================
   AJUSTES
   ========================================================= */
function renderAjustes(view) {
  const b = balances();
  const reorder = (kind, id, i, len) => `
    <button type="button" class="mini-btn" data-action="move" data-kind="${kind}" data-id="${id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${I.up}</button>
    <button type="button" class="mini-btn" data-action="move" data-kind="${kind}" data-id="${id}" data-dir="1" ${i === len - 1 ? 'disabled' : ''} aria-label="Bajar">${I.down}</button>`;
  const catList = (kind) => {
    const list = S.categories.filter((c) => c.kind === kind);
    return list.map((c, i) => `<div class="set-row">${ico(c.emoji)}<div class="main-col"><div class="title">${esc(c.name)}</div></div>
      ${reorder('cat', c.id, i, list.length)}<button type="button" class="mini-btn" data-action="edit-cat" data-id="${c.id}" aria-label="Editar">${I.edit}</button></div>`).join('');
  };
  view.innerHTML = `
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2>Cuentas</h2><button type="button" class="link-btn" data-action="new-account">+ Agregar</button></div>
      ${S.accounts.map((a, i) => `<div class="set-row">${ico(a.emoji)}
        <div class="main-col"><div class="title">${esc(a.name)}</div><div class="meta"><span class="num">${fmt(b[a.id], a.currency)}</span>${multiSpace() ? ` · ${esc(spaceById(spaceOf(a)).name)}` : ''}</div></div>
        <button type="button" class="mini-btn" data-action="sync-balance" data-id="${a.id}" aria-label="Poner al día" title="Poner al día">${I.sync}</button>
        <button type="button" class="mini-btn" data-action="edit-account" data-id="${a.id}" aria-label="Editar">${I.edit}</button>
        <button type="button" class="mini-btn del" data-action="delete-account" data-id="${a.id}" aria-label="Eliminar ${esc(a.name)}" title="Eliminar">${I.trash}</button></div>`).join('')}
    </section>

    ${NATIVE ? '<section class="card" id="captureCard"></section>' : ''}
    ${spacesCard()}

    <section class="card">
      <div class="card-head"><h2 class="h-ico">${ico('img/logo-brubank.png', 'sm')}Poner al día Brubank</h2></div>
      <p class="prose" style="margin-bottom:12px">Pegá el aviso de un pago y se carga solo, o escribí tu saldo real y Pulso lo iguala.</p>
      <div class="btn-row">
        <button type="button" class="btn primary small" data-action="paste-notif">${I.paste}Pegar aviso</button>
        <button type="button" class="btn small" data-action="sync-balance">${I.sync}Poner al día</button>
      </div>
    </section>

    ${syncCard()}
    ${NATIVE ? remindersCard() : `<section class="card">
      <div class="card-head"><h2 class="h-ico">${ico('img/celular.png', 'sm')}App para Android</h2></div>
      <p class="prose" style="margin-bottom:12px">Instalala en el celu: funciona sin internet, te avisa <b>un día antes de cada vencimiento</b> y puede <b>cargar sola los pagos</b> leyendo los avisos de Brubank y Mercado Pago.</p>
      <a class="btn primary small" href="Pulso.apk" download>${I.dl}Descargar Pulso.apk</a>
    </section>`}
  </div>

  <details class="more-settings" ${S.ui.moreSettings ? 'open' : ''}>
    <summary>Más opciones <small>dólar, tema, categorías, copias de seguridad, reloj</small></summary>
  <div class="grid two">
    <section class="card">
      <div class="card-head"><h2 class="h-ico">${ico('img/dolar.png', 'sm')}Cotización del dólar</h2></div>
      <div class="prose" style="margin-bottom:12px"><p>Se usa para sumar tus dólares al total y para ver todo en USD.</p></div>
      <div class="fields-2">
        <label class="field"><span>Tipo</span>
          <select class="select" id="usdKind">${[['blue', 'Blue'], ['bolsa', 'MEP'], ['oficial', 'Oficial'], ['tarjeta', 'Tarjeta'], ['cripto', 'Cripto']].map(([k, l]) => `<option value="${k}" ${S.settings.usdKind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Pesos por dólar</span><input class="input num" id="usdRate" inputmode="decimal" value="${S.settings.usd.toLocaleString('es-AR')}"></label>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <button type="button" class="btn small" data-action="fetch-usd">${I.sync}Actualizar desde internet</button>
        <span class="field hint" id="usdInfo">${S.settings.usdUpdated ? `Actualizado: ${esc(S.settings.usdUpdated)}` : ''}</span>
      </div>
      <p class="field hint" style="margin-top:8px">Para pagos en dólares con tarjeta uso el <b>dólar tarjeta</b>: ${fmt(Math.round(cardRate() * 100))}${S.settings.usdCardDate ? '' : ' (estimado)'}.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Apariencia</h2></div>
      <div class="seg" role="group" aria-label="Tema">
        ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button type="button" class="${S.settings.theme === k ? 'on' : ''}" data-action="set-theme" data-v="${k}">${l}</button>`).join('')}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Categorías de gastos</h2><button type="button" class="link-btn" data-action="new-cat" data-kind="gasto">+ Agregar</button></div>
      ${catList('gasto')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Categorías de ingresos</h2><button type="button" class="link-btn" data-action="new-cat" data-kind="ingreso">+ Agregar</button></div>
      ${catList('ingreso')}
      <div class="card-head" style="margin-top:22px"><h2>Tus datos</h2></div>
      <div class="prose" style="margin-bottom:12px"><p>Todo se guarda <b>solo en este dispositivo</b>. Hacé una copia de seguridad de vez en cuando.</p></div>
      <div class="btn-row">
        <button type="button" class="btn small" data-action="export-json">${I.dl}Copia de seguridad</button>
        <button type="button" class="btn small" data-action="import-json">${I.ul}Restaurar copia</button>
        <button type="button" class="btn small" data-action="export-csv-all">${I.dl}Exportar CSV</button>
        <button type="button" class="btn small" data-action="load-demo">Cargar ejemplo</button>
        <button type="button" class="btn small danger" data-action="wipe">${I.trash}Borrar todo</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h-ico">${ico('img/celular.png', 'sm')}Pulso en tu reloj</h2></div>
      <p class="prose" style="margin-bottom:12px">Simulación de la <b>Xiaomi Smart Band 10 Pro</b>: lo que cargues ahí se guarda de verdad.</p>
      <a class="btn small" href="reloj.html">Abrir simulación</a>
    </section>
  </div>
  </details>`;
  $('.more-settings', view).addEventListener('toggle', (e) => { S.ui.moreSettings = e.target.open; save(); });
  $('#usdRate', view).addEventListener('change', (e) => {
    const v = parseMoney(e.target.value) / 100;
    if (v > 0) { S.settings.usd = v; S.settings.usdUpdated = 'manual'; save(); toast('Cotización guardada'); render(); }
  });
  $('#usdKind', view).addEventListener('change', (e) => { S.settings.usdKind = e.target.value; save(); });
}

/* Dólar tarjeta (con impuestos): para estimar en pesos los servicios que se cobran en dólares. Una vez por día. */
async function fetchCardRate() {
  if (S.settings.usdCardDate === todayISO() || !navigator.onLine) return;
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares/tarjeta', { cache: 'no-store' });
    const v = Number((await r.json()).venta);
    if (v > 0) { S.settings.usdCard = v; S.settings.usdCardDate = todayISO(); persist(); if (['pendientes', 'inicio'].includes(currentView) && !modal().open) render(); }
  } catch { /* sin internet: se usa el último valor */ }
}
async function fetchUsd() {
  const info = $('#usdInfo');
  if (info) info.textContent = 'Buscando…';
  try {
    const r = await fetch(`https://dolarapi.com/v1/dolares/${S.settings.usdKind}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    const v = Number(j.venta);
    if (!(v > 0)) throw new Error('sin dato');
    S.settings.usd = v;
    S.settings.usdUpdated = new Date(j.fechaActualizacion || Date.now()).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    save(); render(); toast(`Dólar ${j.nombre || ''}: ${fmt(v * 100)}`);
  } catch {
    if (info) info.textContent = 'No pude conectarme. Escribilo a mano.';
  }
}

/* =========================================================
   MODAL genérico
   ========================================================= */
const modal = () => $('#modal');
function openModal({ title, body, submit = 'Guardar', cancel = 'Cancelar', onSubmit, onDelete, onOpen, danger = false }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modalFoot').innerHTML = `
    ${onDelete ? `<button type="button" class="btn danger" id="mDel">${I.trash}Eliminar</button>` : ''}
    <span class="spacer"></span>
    <button type="button" class="btn" data-action="close-modal">${esc(cancel)}</button>
    <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button>`;
  const form = $('#modalForm');
  form.onsubmit = (e) => {
    e.preventDefault();
    const ok = onSubmit ? onSubmit(new FormData(form), form) : true;
    if (ok !== false) closeModal();
  };
  if (onDelete) $('#mDel').onclick = () => { onDelete(); closeModal(); };
  if (!modal().open) modal().showModal();
  wireIconPickers(form);
  if (onOpen) onOpen(form);
  const first = form.querySelector('[autofocus]');
  if (first && matchMedia('(min-width: 641px)').matches) setTimeout(() => first.focus(), 40);
}
function closeModal() { if (modal().open) modal().close(); }
function confirmBox(title, text, yes, fn) {
  openModal({ title, body: `<p class="prose">${text}</p>`, submit: yes, danger: true, onSubmit: () => { fn(); } });
}
function optAccounts(sel, cur) {
  const ok = (a) => !cur || a.currency === cur || a.id === sel;
  const opt = (a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)} (${a.currency})</option>`;
  if (!multiSpace()) return S.accounts.filter(ok).map(opt).join('');
  return S.spaces.map((x) => { const l = visAccounts(x.id).filter(ok); return l.length ? `<optgroup label="${esc(x.name)}">${l.map(opt).join('')}</optgroup>` : ''; }).join('');
}
const firstAcc = () => visAccounts()[0]?.id || S.accounts[0]?.id;
const optCats = (kind, sel) => catsFor(kind).map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

/* ---------- Formulario de movimiento ---------- */
function txForm(t = null, preset = {}) {
  const isEdit = !!t;
  const d = t ? clone(t) : { type: 'gasto', amount: 0, desc: '', date: todayISO(), accountId: firstAcc(), categoryId: null, note: '', ...preset };
  if (!S.accounts.length) { toast('Primero agregá una cuenta'); accountForm(); return; }
  let type = d.type === 'ajuste' ? 'ajuste' : d.type;
  let manualCat = !!d.categoryId;
  const catChips = (kind, sel, accId) => catsFor(kind, multiSpace() ? spaceOf(acc(accId)) : 'all').map((c) => `<label><input type="radio" name="categoryId" value="${c.id}" ${c.id === sel ? 'checked' : ''}>${ico(c.emoji)}<span>${esc(c.name)}</span></label>`).join('');
  const body = `
    ${type === 'ajuste' ? '<p class="prose">Este es un <b>ajuste de saldo</b> creado al sincronizar. Podés cambiar el monto o borrarlo.</p>' : `
    <div class="seg typeseg" role="group" aria-label="Tipo">
      <button type="button" data-type="gasto">Gasto</button><button type="button" data-type="ingreso">Ingreso</button><button type="button" data-type="transferencia">Transferencia</button>
    </div>`}
    <label class="amount-input"><span class="cur" id="curSym">$</span>
      <input name="amount" inputmode="decimal" autocomplete="off" placeholder="0" required autofocus value="${d.amount ? (Math.abs(d.amount) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : ''}" aria-label="Monto"></label>
    <label class="field"><span>Descripción</span><input class="input" name="desc" maxlength="80" placeholder="Ej: Coto, Sueldo, Netflix…" value="${esc(d.desc)}" autocomplete="off"></label>
    <div class="auto-note" id="autoNote"></div>
    <div class="field" id="catField"><span class="field-label">Categoría</span><div class="catpick" id="catPick"></div></div>
    <div class="fields-2">
      <label class="field"><span id="accLabel">Cuenta</span><select class="select" name="accountId">${optAccounts(d.accountId)}</select></label>
      <label class="field" id="toField"><span>Hacia</span><select class="select" name="toAccountId">${optAccounts(d.toAccountId || S.accounts.find((a) => a.id !== d.accountId)?.id)}</select></label>
      <label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${d.date}" required></label>
    </div>
    <label class="field" id="toAmtField"><span>Monto que llega (otra moneda)</span><input class="input num" name="toAmount" inputmode="decimal" value="${d.toAmount ? (d.toAmount / 100).toLocaleString('es-AR') : ''}" placeholder="Ej: 100 (USD)"></label>
    <label class="field"><span>Nota (opcional)</span><input class="input" name="note" maxlength="140" value="${esc(d.note || '')}"></label>`;

  openModal({
    title: isEdit ? 'Editar movimiento' : 'Nuevo movimiento',
    body,
    submit: isEdit ? 'Guardar cambios' : 'Agregar',
    onOpen: (form) => {
      const setType = (tp) => {
        type = tp;
        $$('.typeseg button', form).forEach((b) => b.classList.toggle('on', b.dataset.type === tp));
        const isT = tp === 'transferencia', isA = tp === 'ajuste';
        $('#catField', form).hidden = isT || isA;
        $('#toField', form).hidden = !isT;
        $('#accLabel', form).textContent = isT ? 'Desde' : 'Cuenta';
        if (!isT && !isA) {
          const keep = form.categoryId?.value || d.categoryId;
          $('#catPick', form).innerHTML = catChips(tp, keep, form.accountId.value);
        }
        updateCur();
      };
      const updateCur = () => {
        const a = acc(form.accountId.value);
        $('#curSym', form).textContent = a?.currency === 'USD' ? 'US$' : '$';
        const to = acc(form.toAccountId.value);
        $('#toAmtField', form).hidden = !(type === 'transferencia' && to && a && to.currency !== a.currency);
      };
      $$('.typeseg button', form).forEach((b) => b.addEventListener('click', () => { setType(b.dataset.type); manualCat = false; autoCat(); }));
      form.accountId.addEventListener('change', () => { updateCur(); if (multiSpace() && type !== 'transferencia' && type !== 'ajuste') { const keep = form.categoryId?.value; $('#catPick', form).innerHTML = catChips(type, keep, form.accountId.value); } });
      form.toAccountId.addEventListener('change', updateCur);
      $('#catPick', form).addEventListener('change', () => { manualCat = true; $('#autoNote', form).textContent = ''; });
      const autoCat = () => {
        if (manualCat || type === 'transferencia' || type === 'ajuste') return;
        const g = guessCategory(form.desc.value, type);
        const note = $('#autoNote', form);
        if (g) {
          const r = form.querySelector(`input[name="categoryId"][value="${g}"]`);
          if (r && !r.checked) { r.checked = true; note.textContent = `✨ Categoría sugerida: ${cat(g).name}`; }
        } else note.textContent = '';
      };
      form.desc.addEventListener('input', autoCat);
      setType(type);
      if (preset.categoryId) $('#autoNote', form).textContent = '✨ Completado desde la notificación. Revisá y guardá.';
    },
    onSubmit: (fd) => {
      const amount = parseMoney(fd.get('amount'));
      if (!Number.isFinite(amount) || amount === 0) { toast('Escribí un monto válido'); return false; }
      const rec = {
        id: d.id || uid(), type, date: fd.get('date') || todayISO(),
        amount: type === 'ajuste' ? (d.amount < 0 ? -Math.abs(amount) : Math.abs(amount)) : Math.abs(amount),
        desc: String(fd.get('desc') || '').trim(), accountId: fd.get('accountId'), note: String(fd.get('note') || '').trim(),
        categoryId: type === 'gasto' || type === 'ingreso' ? fd.get('categoryId') || null : null,
      };
      if (type === 'transferencia') {
        rec.toAccountId = fd.get('toAccountId');
        if (rec.toAccountId === rec.accountId) { toast('Elegí dos cuentas distintas'); return false; }
        const ta = parseMoney(fd.get('toAmount'));
        const fromCur = acc(rec.accountId)?.currency, toCur = acc(rec.toAccountId)?.currency;
        if (fromCur !== toCur) {
          rec.toAmount = Number.isFinite(ta) && ta > 0 ? ta : (fromCur === 'ARS' ? Math.round(rec.amount / S.settings.usd) : Math.round(rec.amount * S.settings.usd));
        }
        if (!rec.desc) rec.desc = `${accName(rec.accountId)} → ${accName(rec.toAccountId)}`;
      }
      if ((type === 'gasto' || type === 'ingreso') && !rec.categoryId) rec.categoryId = guessCategory(rec.desc, type);
      snapshot();
      if (isEdit) S.txs[S.txs.findIndex((x) => x.id === d.id)] = rec; else S.txs.push(rec);
      save(); render();
      toast(isEdit ? 'Movimiento actualizado' : `${type === 'ingreso' ? 'Ingreso' : type === 'transferencia' ? 'Transferencia' : 'Gasto'} agregado`, true);
    },
    onDelete: isEdit ? () => { snapshot(); S.txs = S.txs.filter((x) => x.id !== d.id); save(); render(); toast('Movimiento eliminado', true); } : null,
  });
}

/* ---------- Formulario de pendiente (incluye compra en cuotas) ---------- */
function pendingForm(p = null, cuotas = false, preset = '') {
  const isEdit = !!p;
  const firstOfNext = addMonths(todayISO().slice(0, 8) + '01', 1);
  const catByName = (re, kind) => S.categories.find((c) => c.kind === kind && re.test(c.name))?.id || null;
  const pesosAcc = visAccounts().find((a) => a.currency === 'ARS')?.id || S.accounts.find((a) => a.currency === 'ARS')?.id || S.accounts[0]?.id;
  const presets = {
    sueldo: { name: 'Sueldo', kind: 'cobrar', variable: true, due: firstOfNext, categoryId: catByName(/sueldo|salario/i, 'ingreso') },
    dolar: { cur: 'USD', variable: false, accountId: pesosAcc, categoryId: catByName(/suscrip/i, 'gasto') },
  };
  const d = p ? clone(p) : { name: '', kind: 'pagar', amount: 0, cur: '', categoryId: null, accountId: firstAcc(), due: addDays(todayISO(), 7), repeat: cuotas ? 'none' : 'monthly', ...(presets[preset] || {}) };
  const cur0 = d.cur || acc(d.accountId)?.currency || 'ARS';
  const title = isEdit ? (d.kind === 'cobrar' ? 'Editar ingreso' : 'Editar pago') : cuotas ? 'Compra en cuotas' : preset === 'sueldo' ? 'Sueldo o ingreso fijo' : preset === 'dolar' ? 'Pago en dólares' : 'Pago fijo';
  const body = `
    ${cuotas ? '<p class="prose">Cargá el <b>valor de cada cuota</b>. Pulso crea un pendiente por mes y te avisa cuando vence cada uno.</p>' : ''}
    ${preset === 'dolar' ? '<p class="prose">Poné el precio en dólares (ej: Duolingo US$ 12). Cuando lo marques como pagado te pregunto <b>cuánto te cobraron en pesos</b>, con impuestos.</p>' : ''}
    ${preset === 'sueldo' ? '<p class="prose">Poné más o menos cuánto cobrás. Cuando llegue, tocás el círculo y escribís el monto exacto.</p>' : ''}
    ${!cuotas && !preset ? `<div class="seg typeseg" style="grid-template-columns:1fr 1fr" role="group" aria-label="Tipo">
      <button type="button" data-kind="pagar">Tengo que pagar</button><button type="button" data-kind="cobrar">Me tienen que pagar</button></div>` : ''}
    <label class="field"><span>${cuotas ? '¿Qué compraste?' : 'Nombre'}</span><input class="input" name="name" required maxlength="60" autofocus value="${esc(d.name)}" placeholder="${cuotas ? 'Ej: Zapatillas, Celular…' : preset === 'dolar' ? 'Ej: Duolingo, Spotify, iCloud…' : 'Ej: Alquiler, Luz, Netflix…'}"></label>
    <label class="amount-input"><select class="cur-select" name="cur" aria-label="Moneda"><option value="ARS" ${cur0 === 'ARS' ? 'selected' : ''}>$</option><option value="USD" ${cur0 === 'USD' ? 'selected' : ''}>US$</option></select><input name="amount" inputmode="decimal" placeholder="${cuotas ? 'Valor de cada cuota' : '0'}" required value="${d.amount ? (d.amount / 100).toLocaleString('es-AR') : ''}" aria-label="Monto"></label>
    <div class="auto-note" id="pEst"></div>
    ${!cuotas ? `<label class="check-line"><input type="checkbox" name="variable" ${d.variable ? 'checked' : ''}><span>El monto cambia cada vez <small>(te pregunto cuánto fue al marcarlo)</small></span></label>` : ''}
    <div class="fields-2">
      <label class="field"><span>${cuotas ? 'Vence la 1ª cuota' : 'Próxima fecha'}</span><input class="input" type="date" name="due" value="${d.due}" required></label>
      ${cuotas ? `<label class="field"><span>Cantidad de cuotas</span><input class="input num" name="count" type="number" min="2" max="48" value="6" required></label>
        <label class="field"><span>Ya pagaste</span><input class="input num" name="paid" type="number" min="0" max="47" value="0"></label>`
        : `<label class="field"><span>Se repite</span><select class="select" name="repeat">${[['none', 'No se repite'], ['weekly', 'Cada semana'], ['monthly', 'Cada mes'], ['yearly', 'Cada año']].map(([k, l]) => `<option value="${k}" ${d.repeat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`}
      <label class="field"><span>Cuenta</span><select class="select" name="accountId">${optAccounts(d.accountId)}</select></label>
      <label class="field"><span>Categoría</span><select class="select" name="categoryId" id="pCat"></select></label>
    </div>
    ${d.of ? `<p class="prose">Esta es la cuota <b>${d.n} de ${d.of}</b>.</p>` : ''}
    ${isEdit && !d.done ? `<button type="button" class="btn small" id="pPayNow">${I.check}${d.kind === 'cobrar' ? 'Ya lo cobré' : 'Ya lo pagué'}</button>` : ''}`;
  let kind = d.kind;
  openModal({
    title,
    body,
    submit: isEdit ? 'Guardar' : 'Agregar',
    onOpen: (form) => {
      const est = () => {
        const a = acc(form.accountId.value);
        const amt = parseMoney(form.amount.value);
        const usdOnPesos = form.cur.value === 'USD' && a?.currency === 'ARS';
        $('#pEst', form).textContent = usdOnPesos
          ? `≈ ${Number.isFinite(amt) ? fmt(Math.round(amt * cardRate())) : '$ …'} en pesos con dólar tarjeta (${fmt(Math.round(cardRate() * 100))}). Al pagarlo ponés el monto real.` : '';
      };
      ['input', 'change'].forEach((ev) => { form.amount.addEventListener(ev, est); form.cur.addEventListener(ev, est); form.accountId.addEventListener(ev, est); });
      est();
      const payNow = $('#pPayNow', form);
      if (payNow) payNow.onclick = () => { closeModal(); setTimeout(() => payPending(d.id), 0); };
      const set = (k) => {
        kind = k;
        $$('[data-kind]', form).forEach((b) => b.classList.toggle('on', b.dataset.kind === k));
        $('#pCat', form).innerHTML = `<option value="">Sin categoría</option>${optCats(k === 'cobrar' ? 'ingreso' : 'gasto', d.categoryId)}`;
      };
      $$('[data-kind]', form).forEach((b) => b.addEventListener('click', () => set(b.dataset.kind)));
      form.name.addEventListener('input', () => {
        if (form.categoryId.value) return;
        const g = guessCategory(form.name.value, kind === 'cobrar' ? 'ingreso' : 'gasto');
        if (g) form.categoryId.value = g;
      });
      set(kind);
    },
    onSubmit: (fd) => {
      const amount = parseMoney(fd.get('amount'));
      const name = String(fd.get('name') || '').trim();
      if (!name) { toast('Poné un nombre'); return false; }
      if (!Number.isFinite(amount) || amount <= 0) { toast('Escribí un monto válido'); return false; }
      snapshot();
      const base = { name, kind, amount, cur: fd.get('cur') || 'ARS', variable: fd.get('variable') === 'on', accountId: fd.get('accountId'), categoryId: fd.get('categoryId') || null, due: fd.get('due'), done: false };
      if (cuotas) {
        const count = Math.max(2, Math.min(48, Number(fd.get('count')) || 2));
        const paid = Math.max(0, Math.min(count - 1, Number(fd.get('paid')) || 0));
        const group = uid();
        for (let i = paid + 1; i <= count; i++) {
          S.pendings.push({ ...base, id: uid(), kind: 'pagar', repeat: 'none', group, n: i, of: count, due: addMonths(base.due, i - paid - 1) });
        }
        toast(`Agendé ${count - paid} cuotas de ${fmt(amount, base.cur)}`, true);
      } else if (isEdit) {
        Object.assign(S.pendings.find((x) => x.id === d.id), base, { repeat: fd.get('repeat') || 'none' });
        toast('Guardado', true);
      } else {
        S.pendings.push({ ...base, id: uid(), repeat: fd.get('repeat') || 'none' });
        toast(kind === 'cobrar' ? 'Ingreso agendado' : 'Pago agendado', true);
      }
      S.ui.ptab = kind === 'cobrar' ? 'cobrar' : 'pagar';
      save(); render();
    },
    onDelete: isEdit ? () => {
      const group = d.group;
      snapshot();
      S.pendings = S.pendings.filter((x) => x.id !== d.id);
      save(); render();
      toast(group ? 'Cuota eliminada' : 'Pendiente eliminado', true);
    } : null,
  });
}

/* ---------- Cuentas ---------- */
/* ---------- Selector de imagen (íconos, logos, link de Google, foto propia) ---------- */
function iconPicker(current, auto = '') {
  const cur = current || 'img/paquete.png';
  const own = !ICON_LIB.some((k) => cur === `img/${k}.png`) && !LOGOS.some(([k]) => cur === `img/logo-${k}.png`);
  const pick = (src, label) => `<button type="button" class="pick ${src === cur ? 'on' : ''}" data-src="${src}" title="${esc(label)}" aria-label="${esc(label)}"><img src="${src}" alt="" loading="lazy"></button>`;
  return `<div class="field picker" data-picker ${auto ? `data-auto="${auto}"` : ''}>
    <input type="hidden" name="emoji" value="${esc(cur)}">
    <div class="picker-top">
      <span class="picker-preview">${ico(cur)}</span>
      <div class="seg" role="group" aria-label="Tipo de imagen">
        <button type="button" data-ptab="iconos" class="${own ? '' : 'on'}">Íconos</button>
        <button type="button" data-ptab="logos">Logos</button>
        <button type="button" data-ptab="propia" class="${own ? 'on' : ''}">Tu imagen</button>
      </div>
    </div>
    <div class="picker-grid" data-pane="iconos" ${own ? 'hidden' : ''}>${ICON_LIB.map((k) => pick(`img/${k}.png`, k.replace('-', ' '))).join('')}</div>
    <div class="picker-grid logos" data-pane="logos" hidden>${LOGO_GROUPS.map(([g, list]) => `<p class="pick-group">${esc(g)}</p>${list.map(([k, l]) => pick(`img/logo-${k}.png`, l)).join('')}`).join('')}</div>
    <div class="picker-own" data-pane="propia" ${own ? '' : 'hidden'}>
      <div class="field"><span>Logo de una página web</span>
        <div class="inline"><input class="input" data-domain placeholder="Ej: uala.com.ar, cuentadni.com.ar" autocomplete="off"><button type="button" class="btn small" data-use="domain">Usar</button></div></div>
      <div class="field"><span>Link de una imagen</span>
        <div class="inline"><input class="input" data-url placeholder="https://…" inputmode="url" autocomplete="off"><button type="button" class="btn small" data-use="url">Usar</button></div>
        <span class="hint">En Google Imágenes: abrí la imagen → mantené apretado (o clic derecho) → <b>Copiar dirección de imagen</b> y pegala acá.</span></div>
      <label class="btn small upload">${I.ul}Subir foto del celular o la compu<input type="file" accept="image/*" data-file hidden></label>
    </div>
  </div>`;
}
function wireIconPickers(form) {
  $$('[data-picker]', form).forEach((pk) => {
    const hidden = pk.querySelector('input[type=hidden]');
    const preview = pk.querySelector('.picker-preview');
    const set = (src, manual = true) => {
      hidden.value = src;
      preview.innerHTML = ico(src);
      $$('.pick', pk).forEach((b) => b.classList.toggle('on', b.dataset.src === src));
      if (manual) pk.dataset.touched = '1';
    };
    $$('[data-ptab]', pk).forEach((b) => b.addEventListener('click', () => {
      $$('[data-ptab]', pk).forEach((x) => x.classList.toggle('on', x === b));
      $$('[data-pane]', pk).forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.ptab; });
    }));
    pk.addEventListener('click', (e) => { const b = e.target.closest('.pick'); if (b) set(b.dataset.src); });
    pk.querySelector('[data-use="domain"]').addEventListener('click', () => {
      const d = pk.querySelector('[data-domain]').value.trim();
      if (!/\.[a-z]{2,}/i.test(d)) { toast('Escribí una web, por ejemplo uala.com.ar'); return; }
      set(faviconOf(d));
    });
    pk.querySelector('[data-use="url"]').addEventListener('click', () => {
      const u = pk.querySelector('[data-url]').value.trim();
      if (!/^https?:\/\//i.test(u)) { toast('El link tiene que empezar con https://'); return; }
      const test = new Image();
      test.onload = () => set(u);
      test.onerror = () => toast('No pude abrir esa imagen. Probá con otro link.');
      test.referrerPolicy = 'no-referrer';
      test.src = u;
    });
    pk.querySelector('[data-file]').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
        set(c.toDataURL('image/webp', 0.85));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => toast('Esa imagen no se pudo leer');
      img.src = URL.createObjectURL(f);
    });
    // al escribir el nombre ("Ualá", "Netflix"…) sugiere el logo
    if (pk.dataset.auto && form.name) {
      form.name.addEventListener('input', () => {
        if (pk.dataset.touched) return;
        const logo = findLogo(form.name.value);
        if (logo) set(logo, false);
      });
    }
  });
}
function accountForm(a = null) {
  const isEdit = !!a;
  const d = a ? clone(a) : { name: '', emoji: 'img/banco.png', currency: 'ARS', initial: 0, space: curSpace() === 'all' ? 'personal' : curSpace() };
  const bal = isEdit ? balances()[a.id] : 0;
  openModal({
    title: isEdit ? 'Editar cuenta' : 'Nueva cuenta',
    body: `
      <label class="field"><span>Nombre</span><input class="input" name="name" required maxlength="30" autofocus value="${esc(d.name)}" placeholder="Ej: Brubank, Mercado Pago, Efectivo…"></label>
      ${iconPicker(d.emoji, isEdit ? '' : 'logo')}
      <div class="fields-2">
        <label class="field"><span>Moneda</span><select class="select" name="currency" ${isEdit ? 'disabled' : ''}><option value="ARS" ${d.currency === 'ARS' ? 'selected' : ''}>Pesos (ARS)</option><option value="USD" ${d.currency === 'USD' ? 'selected' : ''}>Dólares (USD)</option></select></label>
        ${isEdit ? `<div class="field"><span>Saldo actual</span><div class="input num" style="display:flex;align-items:center">${fmt(bal, d.currency)}</div></div>`
          : '<label class="field"><span>Saldo de hoy</span><input class="input num" name="initial" inputmode="decimal" placeholder="0"></label>'}
      </div>
      ${multiSpace() ? `<label class="field"><span>Espacio</span><select class="select" name="space">${optSpaces(spaceOf(d))}</select></label>` : ''}
      ${isEdit ? '<p class="field hint">Para corregir el saldo usá “Poner al día”: así queda registrado el ajuste.</p>' : ''}`,
    onSubmit: (fd) => {
      const name = String(fd.get('name') || '').trim();
      if (!name) { toast('Poné un nombre'); return false; }
      snapshot();
      const space = fd.get('space') || d.space || 'personal';
      if (isEdit) {
        const x = S.accounts.find((y) => y.id === a.id);
        Object.assign(x, { name, emoji: fd.get('emoji') || d.emoji });
        if (space === 'personal') delete x.space; else x.space = space;
      } else {
        const ini = parseMoney(fd.get('initial'));
        S.accounts.push({ id: uid(), name, emoji: fd.get('emoji') || 'img/banco.png', currency: fd.get('currency'), initial: Number.isFinite(ini) ? ini : 0, ...(space !== 'personal' ? { space } : {}) });
      }
      save(); render(); toast(isEdit ? 'Cuenta actualizada' : 'Cuenta creada', true);
    },
    onDelete: isEdit ? () => setTimeout(() => deleteAccount(a), 0) : null,
  });
}

/* Eliminar una cuenta: si tiene movimientos, se borran o se pasan a otra cuenta */
function deleteAccount(a) {
  const uses = (x) => x.accountId === a.id || x.toAccountId === a.id;
  const nTx = S.txs.filter(uses).length;
  const nPend = S.pendings.filter((p) => p.accountId === a.id && !p.done).length;
  const others = S.accounts.filter((x) => x.id !== a.id && x.currency === a.currency);
  const what = [nTx && `${nTx} movimiento${nTx > 1 ? 's' : ''}`, nPend && `${nPend} pendiente${nPend > 1 ? 's' : ''}`].filter(Boolean).join(' y ');
  const body = !what
    ? `<p class="prose">¿Eliminar <b>${esc(a.name)}</b>? No tiene movimientos, así que no cambia nada más.</p>`
    : `<p class="prose" style="margin-bottom:12px"><b>${esc(a.name)}</b> tiene ${what}. ¿Qué hago con eso?</p>
      <div class="choice">
        <label><input type="radio" name="mode" value="delete" checked><span><b>Borrarlos también</b><small>Desaparecen de tus gastos e ingresos.</small></span></label>
        ${others.length ? `<label><input type="radio" name="mode" value="move"><span><b>Pasarlos a otra cuenta</b>
          <select class="select" name="to">${others.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></span></label>` : ''}
      </div>`;
  openModal({
    title: 'Eliminar cuenta', body, submit: 'Eliminar', danger: true,
    onSubmit: (fd) => {
      snapshot();
      const mode = fd.get('mode') || 'delete';
      const to = fd.get('to');
      if (mode === 'move' && to) {
        S.txs.forEach((t) => { if (t.accountId === a.id) t.accountId = to; if (t.toAccountId === a.id) t.toAccountId = to; });
        // una transferencia que quedó de una cuenta a sí misma ya no tiene sentido
        S.txs = S.txs.filter((t) => !(t.type === 'transferencia' && t.accountId === t.toAccountId));
        S.pendings.forEach((p) => { if (p.accountId === a.id) p.accountId = to; });
      } else {
        S.txs = S.txs.filter((t) => !uses(t));
        S.pendings = S.pendings.filter((p) => p.accountId !== a.id || p.done);
      }
      S.accounts = S.accounts.filter((x) => x.id !== a.id);
      if (S.ui.account === a.id) S.ui.account = 'all';
      save(); render(); toast(`Eliminé ${a.name}`, true);
    },
  });
}

/* ---------- Poner al día: escribir el saldo real de cada cuenta ---------- */
function syncForm(focusId) {
  const b = balances();
  if (!S.accounts.length) { accountForm(); return; }
  const plain = (c) => (c / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  openModal({
    title: 'Poner al día',
    body: `
      <p class="prose" style="margin-bottom:12px">Mirá cuánto tenés en cada app o en la billetera y escribilo. Lo que ya está bien, dejalo vacío.</p>
      <div class="sync-list">${S.accounts.map((a) => `
        <label class="sync-item">${ico(a.emoji)}
          <span class="main-col"><span class="title">${esc(a.name)}</span><span class="meta">Pulso dice ${fmt(b[a.id], a.currency)}</span><span class="meta diff" data-diff="${a.id}"></span></span>
          <span class="sync-in"><span>${a.currency === 'USD' ? 'US$' : '$'}</span><input class="input num" name="r_${a.id}" inputmode="decimal" placeholder="${plain(b[a.id])}" ${a.id === focusId ? 'autofocus' : ''} aria-label="Saldo real de ${esc(a.name)}"></span>
        </label>`).join('')}</div>
      <label class="check-line"><input type="checkbox" name="count" checked><span>Contar la diferencia como gasto o ingreso del mes <small>(si no anotaste todo, así tus gastos del mes quedan bien)</small></span></label>`,
    submit: 'Actualizar',
    onOpen: (form) => {
      S.accounts.forEach((a) => {
        const inp = form[`r_${a.id}`];
        inp.addEventListener('input', () => {
          const v = parseMoney(inp.value);
          const el = $(`[data-diff="${a.id}"]`, form);
          if (!Number.isFinite(v)) { el.textContent = ''; el.className = 'meta diff'; return; }
          const d = v - b[a.id];
          el.textContent = d === 0 ? '✓ Coincide' : d < 0 ? `Gastaste ${fmt(-d, a.currency)} sin anotar` : `Entraron ${fmt(d, a.currency)} sin anotar`;
          el.className = `meta diff ${d < 0 ? 'neg' : d > 0 ? 'pos' : ''}`;
        });
      });
      if (focusId && form[`r_${focusId}`] && matchMedia('(max-width: 640px)').matches) setTimeout(() => form[`r_${focusId}`].focus(), 60);
    },
    onSubmit: (fd) => {
      const changes = S.accounts.map((a) => [a, parseMoney(fd.get(`r_${a.id}`))]).filter(([a, v]) => Number.isFinite(v) && v !== b[a.id]);
      if (!changes.length) { toast('Todo estaba al día ✓'); return; }
      snapshot();
      const count = fd.get('count') === 'on';
      const catId = (kind, re) => S.categories.find((c) => c.kind === kind && re.test(c.name))?.id || null;
      for (const [a, real] of changes) {
        const diff = real - b[a.id];
        if (count) {
          const out = diff < 0;
          S.txs.push({ id: uid(), type: out ? 'gasto' : 'ingreso', amount: Math.abs(diff), date: todayISO(), desc: out ? 'Gastos sin anotar' : 'Ingresos sin anotar', accountId: a.id, categoryId: out ? catId('gasto', /^otros$/i) : catId('ingreso', /otros/i), note: 'Al poner al día el saldo' });
        } else {
          S.txs.push({ id: uid(), type: 'ajuste', amount: diff, date: todayISO(), desc: `Ajuste de saldo ${a.name}`, accountId: a.id, categoryId: null });
        }
        a.lastSync = todayISO();
      }
      save(); render(); toast(changes.length === 1 ? `${changes[0][0].name} al día` : `${changes.length} cuentas al día`, true);
    },
  });
}

/* ---------- Pegar notificación ---------- */
function pasteForm() {
  openModal({
    title: 'Pegar notificación',
    body: `
      <p class="prose">Copiá el texto de la notificación o del mail de Brubank, Mercado Pago u otro banco y pegalo acá.</p>
      <label class="field"><span>Texto</span><textarea name="text" autofocus placeholder="Ej: Pagaste $12.345,67 en COTO con tu tarjeta de débito"></textarea></label>
      <div class="btn-row"><button type="button" class="btn small" id="tryPaste">${I.paste}Pegar del portapapeles</button></div>
      <div class="auto-note" id="pPrev"></div>`,
    submit: 'Continuar',
    onOpen: (form) => {
      const prev = () => {
        const r = parseNotification(form.text.value);
        $('#pPrev', form).textContent = r ? `Detecté: ${r.type === 'ingreso' ? 'ingreso' : 'gasto'} de ${fmt(r.amount, acc(r.accountId)?.currency || 'ARS')} · ${r.desc}` : form.text.value ? 'No encontré un monto todavía…' : '';
      };
      form.text.addEventListener('input', prev);
      $('#tryPaste', form).addEventListener('click', async () => {
        try { form.text.value = await navigator.clipboard.readText(); prev(); } catch { toast('Pegalo con mantener apretado → Pegar'); }
      });
    },
    onSubmit: (fd) => {
      const r = parseNotification(fd.get('text'));
      if (!r) { toast('No encontré un monto en ese texto'); return false; }
      setTimeout(() => txForm(null, r), 50);
    },
  });
}

/* ---------- Categorías ---------- */
function catForm(c = null, kind = 'gasto') {
  const isEdit = !!c;
  const d = c ? clone(c) : { name: '', emoji: 'img/paquete.png', kind };
  openModal({
    title: isEdit ? 'Editar categoría' : 'Nueva categoría',
    body: `
      <label class="field"><span>Nombre</span><input class="input" name="name" required maxlength="24" autofocus value="${esc(d.name)}"></label>
      ${iconPicker(d.emoji, isEdit ? '' : 'logo')}`,
    onSubmit: (fd) => {
      const name = String(fd.get('name') || '').trim();
      if (!name) { toast('Poné un nombre'); return false; }
      snapshot();
      if (isEdit) Object.assign(S.categories.find((x) => x.id === c.id), { name, emoji: fd.get('emoji') || 'img/paquete.png' });
      else S.categories.push({ id: uid(), name, emoji: fd.get('emoji') || 'img/paquete.png', kind: d.kind });
      save(); render(); toast('Categoría guardada', true);
    },
    onDelete: isEdit ? () => {
      snapshot();
      S.categories = S.categories.filter((x) => x.id !== c.id);
      delete S.budgets[c.id];
      save(); render(); toast('Categoría eliminada (los movimientos quedan “Sin categoría”)', true);
    } : null,
  });
}

/* ---------- Metas ---------- */
function goalForm(g = null, preset = {}) {
  const isEdit = !!g;
  const d = g ? clone(g) : { name: '', emoji: 'img/diana.png', currency: 'ARS', target: 0, saved: 0, ...preset };
  openModal({
    title: isEdit ? 'Editar meta' : 'Nueva meta',
    body: `
      <label class="field"><span>Nombre</span><input class="input" name="name" required maxlength="40" autofocus value="${esc(d.name)}" placeholder="Ej: Viaje, Compu nueva…"></label>
      ${iconPicker(d.emoji)}
      <div class="fields-2">
        <label class="field"><span>Moneda</span><select class="select" name="currency"><option value="ARS" ${d.currency === 'ARS' ? 'selected' : ''}>Pesos</option><option value="USD" ${d.currency === 'USD' ? 'selected' : ''}>Dólares</option></select></label>
        <label class="field"><span>Objetivo</span><input class="input num" name="target" inputmode="decimal" required value="${d.target ? (d.target / 100).toLocaleString('es-AR') : ''}"></label>
        <label class="field"><span>Ya tengo</span><input class="input num" name="saved" inputmode="decimal" value="${d.saved ? (d.saved / 100).toLocaleString('es-AR') : ''}" placeholder="0"></label>
        <label class="field"><span>¿Para cuándo? (opcional)</span><input class="input" type="month" name="date" min="${monthKey(todayISO())}" value="${d.date || ''}"></label>
      </div>
      <p class="field hint">Con fecha te digo cuánto apartar por mes para llegar.</p>`,
    onSubmit: (fd) => {
      const target = parseMoney(fd.get('target'));
      const saved = parseMoney(fd.get('saved'));
      const name = String(fd.get('name') || '').trim();
      if (!name || !(target > 0)) { toast('Completá nombre y objetivo'); return false; }
      snapshot();
      const rec = { name, emoji: fd.get('emoji') || 'img/diana.png', currency: fd.get('currency'), target, saved: Number.isFinite(saved) ? saved : 0, date: fd.get('date') || null };
      if (isEdit) Object.assign(S.goals.find((x) => x.id === g.id), rec); else S.goals.push({ id: uid(), ...rec });
      save(); render(); toast('Meta guardada', true);
    },
    onDelete: isEdit ? () => { snapshot(); S.goals = S.goals.filter((x) => x.id !== g.id); save(); render(); toast('Meta eliminada', true); } : null,
  });
}
/* ---------- Espacios (Personal, Mi negocio…) ---------- */
const BIZ_CATS = [
  ['ingreso', 'Ventas', 'img/bolsa-plata.png'],
  ['gasto', 'Mercadería', 'img/paquete.png'],
  ['gasto', 'Publicidad', 'img/cohete.png'],
  ['gasto', 'Envíos', 'img/auto.png'],
  ['gasto', 'Herramientas', 'img/herramientas.png'],
  ['gasto', 'Impuestos', 'img/balanza.png'],
];
function spacesCard() {
  const b = balances();
  if (!multiSpace()) {
    return `<section class="card">
      <div class="card-head"><h2 class="h-ico">${ico('img/maletin.png', 'sm')}Separar un negocio</h2></div>
      <p class="prose" style="margin-bottom:12px">¿Emprendés o tenés un negocio? Dale su <b>propio espacio</b>: sus cuentas, ventas y gastos quedan aparte de tu plata personal. Arriba elegís ver cada uno o todo junto.</p>
      <button type="button" class="btn primary small" data-action="new-space">${I.plus}Crear espacio aparte</button>
    </section>`;
  }
  return `<section class="card">
    <div class="card-head"><h2 class="h-ico">${ico('img/maletin.png', 'sm')}Espacios</h2><button type="button" class="link-btn" data-action="new-space">+ Agregar</button></div>
    ${S.spaces.map((s) => {
      const list = visAccounts(s.id);
      const tot = list.reduce((x, a) => x + toARS(b[a.id], a.currency), 0);
      return `<div class="set-row">${ico(s.emoji)}
        <div class="main-col"><div class="title">${esc(s.name)}</div><div class="meta">${list.length} cuenta${list.length === 1 ? '' : 's'} · <span class="num">${show(tot)}</span></div></div>
        <button type="button" class="mini-btn" data-action="edit-space" data-id="${s.id}" aria-label="Editar ${esc(s.name)}">${I.edit}</button></div>`;
    }).join('')}
  </section>`;
}
const optSpaces = (sel) => S.spaces.map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');

function spaceForm(s = null) {
  const isEdit = !!s;
  const d = s ? clone(s) : { name: '', emoji: 'img/maletin.png', kind: 'negocio' };
  const movable = S.accounts.filter((a) => !isEdit && spaceOf(a) === 'personal');
  openModal({
    title: isEdit ? 'Editar espacio' : 'Nuevo espacio',
    body: `
      ${isEdit ? '' : '<p class="prose" style="margin-bottom:12px">Un espacio junta sus propias cuentas. Lo que pase ahí no se mezcla con tu plata personal.</p>'}
      <label class="field"><span>Nombre</span><input class="input" name="name" required maxlength="24" autofocus value="${esc(d.name)}" placeholder="Ej: Mi negocio, Tienda, Freelance…"></label>
      ${iconPicker(d.emoji)}
      ${d.id === 'personal' ? '' : `<label class="check-line"><input type="checkbox" name="biz" ${d.kind === 'negocio' ? 'checked' : ''}><span>Es un negocio <small>(muestra la ganancia del mes${isEdit ? '' : ' y agrega categorías: Ventas, Mercadería, Publicidad, Envíos…'})</small></span></label>`}
      ${isEdit ? '' : `
        <div class="sub-title">Cuentas del negocio</div>
        ${movable.length ? `<p class="field hint" style="margin-top:0">¿Alguna de tus cuentas ya es del negocio? Marcala y la paso:</p>
          <div class="check-list">${movable.map((a) => `<label class="check-line"><input type="checkbox" name="move" value="${a.id}">${ico(a.emoji, 'xs')}<span>${esc(a.name)}</span></label>`).join('')}</div>` : ''}
        <div class="fields-2">
          <label class="field"><span>Cuenta nueva (opcional)</span><input class="input" name="accName" maxlength="30" placeholder="Ej: Mercado Pago del negocio"></label>
          <label class="field"><span>Saldo de hoy</span><input class="input num" name="accInitial" inputmode="decimal" placeholder="0"></label>
        </div>`}`,
    submit: isEdit ? 'Guardar' : 'Crear espacio',
    onSubmit: (fd) => {
      const name = String(fd.get('name') || '').trim();
      if (!name) { toast('Poné un nombre'); return false; }
      const kind = d.id === 'personal' ? 'personal' : fd.get('biz') === 'on' ? 'negocio' : 'otro';
      snapshot();
      if (isEdit) {
        Object.assign(spaceById(s.id), { name, emoji: fd.get('emoji') || d.emoji, kind });
        save(); render(); toast('Espacio guardado', true);
        return;
      }
      const sp = { id: uid(), name, emoji: fd.get('emoji') || d.emoji, kind };
      S.spaces.push(sp);
      if (kind === 'negocio') {
        BIZ_CATS.forEach(([k, n, e]) => S.categories.push({ id: uid(), kind: k, name: n, emoji: e, space: sp.id }));
      }
      fd.getAll('move').forEach((id) => { const a = acc(id); if (a) a.space = sp.id; });
      const accName = String(fd.get('accName') || '').trim();
      if (accName) {
        const ini = parseMoney(fd.get('accInitial'));
        S.accounts.push({ id: uid(), name: accName, emoji: findLogo(accName) || 'img/banco.png', currency: 'ARS', initial: Number.isFinite(ini) ? ini : 0, space: sp.id });
      }
      S.ui.space = sp.id;
      save(); location.hash = '#inicio'; render(true);
      toast(visAccounts(sp.id).length ? `Listo: «${name}» tiene su propio espacio` : `Listo. Agregale una cuenta a «${name}»`, true);
    },
    onDelete: isEdit && s.id !== 'personal' ? () => setTimeout(() => {
      const n = visAccounts(s.id).length;
      confirmBox(`Eliminar «${s.name}»`, `${n ? `Sus ${n} cuenta${n === 1 ? '' : 's'} pasan a <b>Personal</b>. ` : ''}No se borra ningún movimiento.`, 'Eliminar espacio', () => {
        snapshot();
        S.accounts.forEach((a) => { if (a.space === s.id) delete a.space; });
        const used = new Set(S.txs.map((t) => t.categoryId).concat(S.pendings.map((p) => p.categoryId)));
        S.categories = S.categories.filter((c) => c.space !== s.id || used.has(c.id));
        S.categories.forEach((c) => { if (c.space === s.id) delete c.space; });
        S.spaces = S.spaces.filter((x) => x.id !== s.id);
        if (S.ui.space === s.id) S.ui.space = 'all';
        save(); render(); toast('Espacio eliminado', true);
      });
    }, 0) : null,
  });
}

/* ---------- Pagarte un sueldo desde el negocio ----------
   Es una transferencia marcada (ownerPay): para el negocio es "lo que te pagaste" (no un gasto)
   y para tu plata personal cuenta como ingreso. */
function ownerPayForm(spId = curSpace()) {
  const sp = spaceById(spId);
  if (!sp || spId === 'personal') return;
  const from = visAccounts(spId);
  const to = visAccounts('personal');
  if (!from.length || !to.length) { toast(!from.length ? 'Primero agregale una cuenta al negocio' : 'Necesitás una cuenta personal'); return; }
  const st = monthStats(monthKey(todayISO()), spId);
  const suggest = sp.salary || Math.max(0, Math.round((st.net - st.ownerPaid) / 100000) * 100000);
  const opts = (list, sel) => list.map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)} (${a.currency})</option>`).join('');
  const toDef = to.find((a) => a.currency === from[0].currency)?.id || to[0].id;
  openModal({
    title: 'Pagarme el sueldo',
    body: `
      <p class="prose" style="margin-bottom:12px">Pasá plata de <b>${esc(sp.name)}</b> a tu plata personal. Así el negocio y tus gastos no se mezclan.
        ${st.ownerPaid ? `<br>Este mes ya te pagaste <b>${show(st.ownerPaid)}</b>.` : ''} ${st.net > 0 ? `Ganancia del mes: <b>${show(st.net)}</b>.` : ''}</p>
      <label class="amount-input"><span class="cur">$</span><input name="amount" inputmode="decimal" required autofocus placeholder="0" value="${suggest ? (suggest / 100).toLocaleString('es-AR') : ''}" aria-label="Monto"></label>
      <div class="fields-2">
        <label class="field"><span>Sale de</span><select class="select" name="from">${opts(from, from[0].id)}</select></label>
        <label class="field"><span>Entra en</span><select class="select" name="to">${opts(to, toDef)}</select></label>
        <label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${todayISO()}" required></label>
      </div>
      <label class="check-line"><input type="checkbox" name="fixed" ${sp.salary ? 'checked' : ''}><span>Es mi sueldo fijo <small>la próxima vez te propongo este mismo monto</small></span></label>`,
    submit: 'Pagarme',
    onSubmit: (fd) => {
      const amount = parseMoney(fd.get('amount'));
      if (!(amount > 0)) { toast('Escribí el monto'); return false; }
      const a = acc(fd.get('from')), b = acc(fd.get('to'));
      snapshot();
      const tx = { id: uid(), type: 'transferencia', ownerPay: true, date: fd.get('date') || todayISO(), amount, accountId: a.id, toAccountId: b.id, desc: `Sueldo de ${sp.name}`, note: '' };
      if (a.currency !== b.currency) tx.toAmount = a.currency === 'ARS' ? Math.round(amount / S.settings.usd) : Math.round(amount * S.settings.usd);
      S.txs.push(tx);
      if (fd.get('fixed') === 'on') sp.salary = amount; else delete sp.salary;
      save(); render();
      toast(`Te pagaste ${fmt(amount, a.currency)} 💼`, true);
      if (S.plan?.rate) {
        const ars = toARS(tx.toAmount ?? amount, b.currency);
        setTimeout(() => apartarForm({ suggest: Math.round((ars * S.plan.rate) / 100), title: '¿Apartás tu ahorro?', intro: `Te pagaste <b>${fmt(amount, a.currency)}</b>. Tu plan dice apartar el <b>${S.plan.rate}%</b> primero.`, }), 450);
      }
    },
  });
}

/* ---------- Resumen del mes ---------- */
function summaryModal(mk = monthKey(addMonths(todayISO().slice(0, 8) + '01', -1))) {
  const cur = monthKey(todayISO());
  const sp = multiSpace() ? 'personal' : 'all';
  const st = monthStats(mk, sp);
  const prevMk = monthKey(addMonths(mk + '-01', -1));
  const prev = monthStats(prevMk, sp);
  const saved = S.goals.reduce((s, g) => s + (g.log || []).filter((l) => monthKey(l.d) === mk).reduce((x, l) => x + toARS(l.a, g.currency), 0), 0);
  const txs = S.txs.filter((t) => monthKey(t.date) === mk && inSpace(t.accountId, sp));
  const biggest = txs.filter((t) => t.type === 'gasto').sort((a, b) => toARS(b.amount, txCur(b)) - toARS(a.amount, txCur(a)))[0];
  const paid = S.pendings.filter((p) => p.done && p.doneAt && monthKey(p.doneAt) === mk && inSpace(p.accountId, sp)).length;
  const autoN = txs.filter((t) => t.auto).length;
  const top = Object.entries(st.byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  const delta = (a, b, goodWhenUp) => {
    const p = pct(a, b);
    if (p === null || p === 0) return '';
    const good = goodWhenUp ? p > 0 : p < 0;
    return `<small class="delta ${good ? 'good' : 'bad'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)}% vs ${monthLabel(prevMk)}</small>`;
  };
  const rate = st.income > 0 ? Math.round((st.net / st.income) * 100) : null;
  // un consejo para el mes que viene
  let advice = '';
  const grew = top.map(([id, v]) => [id, v, pct(v, prev.byCat[id] || 0)]).filter(([, , p]) => p !== null && p >= 20).sort((a, b) => b[2] - a[2])[0];
  if (grew && cat(grew[0])) advice = `En <b>${esc(cat(grew[0]).name)}</b> gastaste ${grew[2]}% más que en ${monthLabel(prevMk, true)}. Probá ponerle un límite en Planes.`;
  else if (S.plan?.rate && st.income) {
    const target = Math.round((st.income * S.plan.rate) / 100);
    advice = saved >= target ? `Cumpliste tu plan de ahorro (${S.plan.rate}%). ¡Seguí así!` : `Tu plan era apartar ${show(target, true)} y apartaste ${show(Math.max(0, saved), true)}. El próximo mes apartalo apenas cobres.`;
  } else if (!S.plan?.rate) advice = 'Armá un plan de ahorro en Planes: apartar un 10–20% apenas cobrás es lo que más ayuda.';
  const biz = S.spaces.filter((s) => s.kind === 'negocio').map((s) => {
    const b = monthStats(mk, s.id);
    if (!b.income && !b.expense && !b.ownerPaid) return '';
    return `<div class="sum-biz">${ico(s.emoji, 'sm')}<div class="main-col"><b>${esc(s.name)}</b>
      <span>Vendiste ${show(b.income, true)} · Gastaste ${show(b.expense, true)} · ${b.net >= 0 ? 'Ganancia' : 'Pérdida'} <b class="${b.net >= 0 ? 'amt in' : ''}">${show(Math.abs(b.net), true)}</b>${b.ownerPaid ? ` · Te pagaste ${show(b.ownerPaid, true)}` : ''}</span></div></div>`;
  }).join('');
  const has = st.income || st.expense || txs.length;
  openModal({
    title: `Resumen de ${monthLabel(mk, true)}${mk === cur ? ' (hasta hoy)' : ''}`,
    body: `
      <div class="sum-nav">
        <button type="button" class="btn small" data-action="summary" data-mk="${prevMk}" aria-label="Mes anterior">‹ ${monthLabel(prevMk)}</button>
        ${mk < cur ? `<button type="button" class="btn small" data-action="summary" data-mk="${monthKey(addMonths(mk + '-01', 1))}" aria-label="Mes siguiente">${monthLabel(monthKey(addMonths(mk + '-01', 1)))} ›</button>` : ''}
      </div>
      ${!has ? emptyBox('calendario', 'No hay movimientos en este mes.') : `
      <div class="sum-hero ${st.net >= 0 ? 'good' : 'bad'}">
        <span>${st.net >= 0 ? 'Te sobró' : 'Gastaste de más'}</span>
        <b class="num">${cents(show(Math.abs(st.net)))}</b>
        ${rate !== null && st.net > 0 ? `<small>Guardaste el ${rate}% de lo que entró</small>` : ''}
      </div>
      <div class="sum-grid">
        <div><span>Entró</span><b class="num amt in">${cents(show(st.income))}</b>${delta(st.income, prev.income, true)}</div>
        <div><span>Gastaste</span><b class="num">${cents(show(st.expense))}</b>${delta(st.expense, prev.expense, false)}</div>
        <div><span>Apartaste</span><b class="num">${cents(show(Math.max(0, saved)))}</b></div>
        <div><span>Pagos al día</span><b class="num">${paid}</b><small>${txs.length} movimientos${autoN ? ` · ${autoN} cargados solos` : ''}</small></div>
      </div>
      ${top.length ? `<div class="sub-title">En qué se fue</div>${top.map(([id, v]) => {
        const c = cat(id) || { name: 'Sin categoría', emoji: 'img/pregunta.png' };
        const w = st.expense ? (v / st.expense) * 100 : 0;
        return `<div class="sum-cat">${ico(c.emoji, 'xs')}<span class="n">${esc(c.name)}</span><span class="bar"><i style="width:${w.toFixed(1)}%"></i></span><b class="num">${show(v, true)}</b></div>`;
      }).join('')}` : ''}
      ${biggest ? `<p class="hint-line" style="text-align:left">Tu gasto más grande: <b>${esc(biggest.desc || catOf(biggest).name)}</b> · ${fmt(biggest.amount, txCur(biggest))} (${shortDate(biggest.date)})</p>` : ''}
      ${biz ? `<div class="sub-title">Negocio</div>${biz}` : ''}
      ${advice ? `<div class="plan-tip">${ico('img/brillos.png', 'sm')}<div class="main-col"><b>Para el mes que viene</b><span>${advice}</span></div></div>` : ''}`}`,
    submit: 'Listo',
    cancel: 'Cerrar',
    onSubmit: () => true,
  });
  if (mk === monthKey(addMonths(cur + '-01', -1))) { S.ui.seenSummary = mk; persist(); }
}

/* ---------- Carga automática: avisos de Brubank, Mercado Pago, etc. (solo app Android) ---------- */
const Capt = () => window.Capacitor?.Plugins?.PulsoNotif || (NATIVE && window.Capacitor?.registerPlugin ? window.Capacitor.registerPlugin('PulsoNotif') : null);
/** Qué cuenta corresponde a cada app (por el nombre de la cuenta). */
const SRC_ACCOUNT = [
  [/brubank/, /brubank/i], [/mercadopago/, /mercado ?pago|^mp\b/i], [/uala/, /ual[aá]/i], [/naranja/, /naranja/i],
  [/galicia/, /galicia/i], [/santander/, /santander/i], [/bbva/, /bbva|franc[eé]s/i], [/macro/, /macro/i], [/icbc/, /icbc/i],
  [/bapro|cuentadni/, /provincia|cuenta ?dni/i], [/bna/, /naci[oó]n|bna/i], [/lemon/, /lemon/i], [/belo/, /belo/i], [/prex/, /prex/i],
  [/personalpay/, /personal ?pay/i], [/modo/, /modo/i], [/cocos/, /cocos/i],
];
const SRC_NAME = { brubank: 'Brubank', mercadopago: 'Mercado Pago', uala: 'Ualá', naranja: 'Naranja X', shell: 'Prueba' };
const srcName = (pkg) => Object.entries(SRC_NAME).find(([k]) => pkg.includes(k))?.[1] || 'tu banco';
/** ¿El aviso es un movimiento de plata (y no una promo)? */
function isMoneyMove(text) {
  const n = norm(text);
  if (/(gana|ganas|promo|descuento|beneficio|oferta|invita|sorteo|cuotas sin interes|prestamo preaprobado|aprovecha|hasta el \d|reintegro de hasta|tope)/.test(n)) return false;
  return /(pagaste|compraste|compra |transferiste|enviaste|recibiste|te (transfirio|envio|pago|depositaron|llego)|cobraste|debito|debitamos|acreditamos|acredito|se acredito|ingreso de dinero|extraccion|retiraste|pago de servicio|consumo)/.test(n);
}
let capturing = false;
async function importCaptured() {
  const P = Capt();
  if (!P || capturing || S.settings.autoCapture === false) return;
  capturing = true;
  try {
    const { items = [] } = await P.take();
    if (!items.length) return;
    S.capt = S.capt || { seen: [] };
    const seen = new Set(S.capt.seen);
    const added = [];
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      const text = `${it.title || ''}. ${it.text || ''}`;
      if (!isMoneyMove(text)) continue;
      const r = parseNotification(text, it.pkg);
      if (!r || !r.accountId) continue;
      if (it.time) r.date = toISO(new Date(Number(it.time)));
      // si ya lo cargaste a mano (mismo día, monto y tipo), no lo repito
      if (S.txs.some((t) => t.date === r.date && t.amount === r.amount && t.type === r.type && t.accountId === r.accountId)) continue;
      if (!r.categoryId) r.categoryId = S.categories.find((c) => c.kind === r.type && /^otros/i.test(c.name) && !c.space)?.id || null;
      added.push({ id: uid(), ...r, note: `Cargado solo desde el aviso de ${srcName(it.pkg)}`, auto: true });
    }
    S.capt.seen = [...seen].slice(-400);
    if (added.length) {
      snapshot();
      S.txs.push(...added);
      save(); if (!modal().open) render();
      toast(added.length === 1 ? `Se cargó solo: ${added[0].desc} · ${fmt(added[0].amount, txCur(added[0]))}` : `Se cargaron solos ${added.length} movimientos`, true);
    } else persist();
  } catch (e) { console.warn('avisos', e); } finally { capturing = false; }
}
async function captureCard() {
  const P = Capt();
  let on = false;
  try { on = P ? (await P.isEnabled()).enabled : false; } catch { /* sin plugin */ }
  const off = S.settings.autoCapture === false;
  const el = $('#captureCard');
  if (!el) return;
  el.innerHTML = `
    <div class="card-head"><h2 class="h-ico">${ico('img/cohete.png', 'sm')}Cargar pagos solos</h2>${on && !off ? '<span class="tag good">✓ Activo</span>' : ''}</div>
    <p class="prose" style="margin-bottom:12px">${on && !off
      ? 'Cuando te llega un aviso de <b>Brubank, Mercado Pago, Ualá</b> u otro banco, Pulso anota el gasto o el ingreso solo. Los ves en Movimientos con el rayito ⚡.'
      : 'Pulso puede leer los avisos de <b>Brubank, Mercado Pago, Ualá</b> y otros bancos y anotar cada pago solo. Solo mira esas apps, y lo que lee queda en tu celular.'}</p>
    <div class="btn-row">
      ${!on ? '<button type="button" class="btn primary small" data-action="capt-enable">Activar</button>'
        : off ? '<button type="button" class="btn primary small" data-action="capt-toggle">Volver a activar</button>'
          : '<button type="button" class="btn small" data-action="capt-toggle">Pausar</button><button type="button" class="btn small" data-action="capt-enable">Permiso de Android</button>'}
    </div>`;
}
function initCapture() {
  const P = Capt();
  if (!P) return;
  try { P.addListener('aviso', () => importCaptured()); } catch { /* versión vieja */ }
  importCaptured();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    importCaptured();
    if (currentView === 'ajustes') captureCard();
  });
}

/* ---------- Exportar / importar ---------- */
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportCSV(list) {
  const rows = [['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Hacia', 'Moneda', 'Monto', 'Nota']];
  list.forEach((t) => rows.push([t.date, t.type, t.desc, catOf(t).name, accName(t.accountId), t.toAccountId ? accName(t.toAccountId) : '', txCur(t), (t.amount / 100).toFixed(2).replace('.', ','), t.note || '']));
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(`pulso-movimientos-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8');
  toast(`Exporté ${list.length} movimientos`);
}

/* =========================================================
   SINCRONIZACIÓN celular ↔ compu (cifrada de punta a punta)
   - Cada usuario tiene un código secreto. Con él se derivan:
     · un id (SHA-256) para encontrar el archivo en la nube
     · una clave AES-256 (PBKDF2) para cifrar/descifrar
   - El servidor (api/sync.js + Vercel Blob privado) solo ve datos cifrados.
   - Si dos dispositivos cambian a la vez, se combinan los cambios (merge de 3 vías por id).
   ========================================================= */
// En la app de Android la página corre en https://localhost: la API está en el sitio publicado
const WEB_URL = 'https://pulso-finanzas-three.vercel.app/';
const SYNC_API = (window.Capacitor?.isNativePlatform?.() ? WEB_URL : '') + 'api/sync';
const COLLS = ['accounts', 'categories', 'txs', 'pendings', 'goals', 'spaces'];
let syncKey = null, syncId = null, syncTimer = null, syncChain = Promise.resolve(), syncState = 'off';

function toB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function fromB64(str) { const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const prettyCode = (c) => (cleanCode(c).match(/.{1,4}/g) || []).join('-');
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para no confundirse
  return [...crypto.getRandomValues(new Uint8Array(16))].map((x) => A[x % 32]).join('');
}
async function deriveSync(code) {
  const enc = new TextEncoder();
  const c = cleanCode(code);
  const idBuf = await crypto.subtle.digest('SHA-256', enc.encode('pulso-id:' + c));
  syncId = [...new Uint8Array(idBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const base = await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  syncKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('pulso-sync-v1'), iterations: 210000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const payload = () => ({
  accounts: S.accounts, categories: S.categories, txs: S.txs, pendings: S.pendings, goals: S.goals, budgets: S.budgets, spaces: S.spaces, plan: S.plan,
  demo: !!S.demo, settings: { usd: S.settings.usd, usdKind: S.settings.usdKind, usdUpdated: S.settings.usdUpdated, usdCard: S.settings.usdCard, usdCardDate: S.settings.usdCardDate },
  savedAt: new Date().toISOString(),
});
async function encryptDoc(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, syncKey, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, iv: toB64(iv), ct: toB64(new Uint8Array(ct)) });
}
async function decryptDoc(text) {
  const d = JSON.parse(text);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(d.iv) }, syncKey, fromB64(d.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch { throw new Error('clave'); }
}
const idsOf = (data) => Object.fromEntries(COLLS.map((k) => [k, (data[k] || []).map((x) => x.id)]));
/** Merge de 3 vías: base = lo último sincronizado. Respeta altas y bajas de ambos lados; si los dos editaron lo mismo, gana este dispositivo. */
function mergeData(local, remote, base) {
  const out = {};
  for (const k of COLLS) {
    if (!(k in remote)) { out[k] = local[k] || []; continue; } // versión vieja que no conoce esta lista: no borrar nada
    const b = new Set(base?.[k] || []);
    const L = new Map((local[k] || []).map((x) => [x.id, x]));
    const R = new Map((remote[k] || []).map((x) => [x.id, x]));
    const res = [];
    for (const [id, x] of L) if (R.has(id) || !b.has(id)) res.push(x); // si estaba sincronizado y el otro lo borró, se va
    for (const [id, x] of R) if (!L.has(id) && !b.has(id)) res.push(x); // nuevo en el otro dispositivo
    out[k] = res;
  }
  out.budgets = { ...(remote.budgets || {}), ...(local.budgets || {}) };
  out.plan = { ...(remote.plan || {}), ...(local.plan || {}) };
  return out;
}
function applyData(data) {
  COLLS.forEach((k) => { S[k] = data[k] || []; });
  S.budgets = data.budgets || {};
  if (data.plan) S.plan = data.plan;
  if ('demo' in data) S.demo = !!data.demo;
  if (data.settings) Object.assign(S.settings, data.settings);
  migrate();
  lastDataHash = dataSig();
  remindersSoon();
}
async function apiGet() {
  const r = await fetch(`${SYNC_API}?id=${syncId}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('get ' + r.status);
  return r.json();
}
async function apiPut(body, etag) {
  const r = await fetch(`${SYNC_API}?id=${syncId}`, {
    method: 'PUT', body,
    headers: { 'Content-Type': 'application/json', ...(etag ? { 'X-If-Match': etag } : {}) },
  });
  if (r.status === 409) return { conflict: true };
  if (!r.ok) throw new Error('put ' + r.status);
  return r.json();
}
function scheduleSync() { clearTimeout(syncTimer); setSyncState('pending'); syncTimer = setTimeout(() => syncNow(), 1500); }
function syncNow(manual = false) {
  if (!S.sync?.code) return Promise.resolve();
  clearTimeout(syncTimer);
  syncChain = syncChain.then(() => doSync(manual)).catch(() => {});
  return syncChain;
}
async function doSync(manual) {
  if (!navigator.onLine) { setSyncState('offline'); return; }
  setSyncState('busy');
  try {
    if (!syncKey) await deriveSync(S.sync.code);
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await apiGet();
      if (remote && remote.etag !== S.sync.etag) {
        const data = await decryptDoc(remote.doc);
        if (S.sync.dirty) {
          const merged = mergeData(S, data, S.sync.base);
          COLLS.forEach((k) => { S[k] = merged[k]; });
          S.budgets = merged.budgets;
          S.plan = merged.plan;
          migrate();
          lastDataHash = dataSig();
        } else {
          applyData(data);
          Object.assign(S.sync, { etag: remote.etag, base: idsOf(S), last: new Date().toISOString() });
          persist(); render(); setSyncState('ok');
          if (manual) toast('Datos actualizados desde la nube');
          return;
        }
        S.sync.etag = remote.etag;
      }
      if (!S.sync.dirty && remote) {
        S.sync.last = new Date().toISOString(); persist(); setSyncState('ok');
        if (manual) toast('Todo al día ✓');
        return;
      }
      const res = await apiPut(await encryptDoc(payload()), remote ? S.sync.etag : null);
      if (res.conflict) continue; // otro dispositivo guardó justo antes: volvemos a leer y combinar
      Object.assign(S.sync, { etag: res.etag, dirty: false, base: idsOf(S), last: new Date().toISOString() });
      persist(); setSyncState('ok');
      if (currentView !== 'ajustes' || manual) render();
      if (manual) toast('Sincronizado ✓');
      return;
    }
    throw new Error('conflictos');
  } catch (e) {
    setSyncState(e.message === 'clave' ? 'badkey' : 'error');
    if (manual) toast(e.message === 'clave' ? 'El código no coincide con los datos de la nube' : 'No pude sincronizar. Reviso de nuevo más tarde.');
  }
}
const SYNC_LABEL = {
  off: 'Sin sincronizar', ok: 'Sincronizado', busy: 'Sincronizando…', pending: 'Cambios por subir…',
  offline: 'Sin conexión: se sube cuando vuelva internet', error: 'Error al sincronizar', badkey: 'El código no coincide',
};
function setSyncState(st) {
  syncState = st;
  const b = $('#syncBtn');
  if (b) { b.hidden = st === 'off'; b.dataset.state = st; b.title = SYNC_LABEL[st]; b.setAttribute('aria-label', SYNC_LABEL[st]); }
  const t = $('#syncStatus');
  if (t) t.innerHTML = syncStatusText();
}
function syncStatusText() {
  const last = S.sync?.last ? new Date(S.sync.last).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca';
  return `<span class="sync-dot" data-state="${syncState}"></span><b>${SYNC_LABEL[syncState]}</b> · última vez: ${last}`;
}
function syncCard() {
  if (S.sync?.code) {
    return `<section class="card sync-card">
      <div class="card-head"><h2 class="h-ico">${ico('img/mundo.png', 'sm')}Celular ↔ compu</h2></div>
      <p class="prose" style="margin-bottom:10px">Este dispositivo está <b>sincronizado</b>. Lo que cargues acá aparece en tus otros dispositivos, cifrado con tu código.</p>
      <div class="summary" id="syncStatus">${syncStatusText()}</div>
      <div class="btn-row">
        <button type="button" class="btn primary small" data-action="sync-now">${I.sync}Sincronizar ahora</button>
        <button type="button" class="btn small" data-action="sync-code">Vincular otro dispositivo</button>
        <button type="button" class="btn small danger" data-action="sync-off">Desconectar</button>
      </div>
    </section>`;
  }
  return `<section class="card sync-card">
    <div class="card-head"><h2 class="h-ico">${ico('img/mundo.png', 'sm')}Celular ↔ compu</h2></div>
    <div class="prose">
      <p>Guardá tus datos en la nube para tenerlos en el celular y en la compu. Viajan <b>cifrados</b>: solo se pueden leer con tu código secreto.</p>
      <ol class="steps"><li>En un dispositivo tocá <b>Activar</b> y te da un código (y un QR).</li><li>En el otro tocá <b>Tengo un código</b> o escaneá el QR.</li></ol>
      <div class="btn-row">
        <button type="button" class="btn primary small" data-action="sync-on">Activar sincronización</button>
        <button type="button" class="btn small" data-action="sync-link">Tengo un código</button>
      </div>
    </div>
  </section>`;
}
async function enableSync() {
  S.sync = { code: newCode(), etag: null, dirty: true, base: null, last: null };
  syncKey = null;
  persist();
  await syncNow();
  render();
  if (syncState === 'ok') showCode(true);
  else toast('No pude conectar con la nube. Probá de nuevo en un rato.');
}
function disableSync() { S.sync = null; syncKey = null; syncId = null; persist(); setSyncState('off'); render(); toast('Este dispositivo ya no se sincroniza'); }
let qrLib = null;
function loadQR() {
  if (qrLib) return qrLib;
  qrLib = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => ok(window.qrcode); s.onerror = fail;
    document.head.appendChild(s);
  });
  return qrLib;
}
function showCode(first = false) {
  const code = S.sync.code;
  const link = `${NATIVE ? WEB_URL : location.origin + location.pathname}#vincular=${prettyCode(code)}`;
  openModal({
    title: first ? '¡Sincronización activada!' : 'Vincular otro dispositivo',
    body: `
      <p class="prose">Escaneá este QR con el celular (o abrí Pulso en el otro dispositivo → Ajustes → <b>Tengo un código</b>).</p>
      <div class="qr-box" id="qrBox"><span class="hint">Generando QR…</span></div>
      <div class="code-big num">${prettyCode(code)}</div>
      <div class="btn-row" style="justify-content:center">
        <button type="button" class="btn small" id="cpCode">Copiar código</button>
        <button type="button" class="btn small" id="cpLink">Copiar link</button>
      </div>
      <p class="field hint">⚠ Guardá este código en un lugar seguro: es la llave de tus datos. Quien lo tenga puede verlos.</p>`,
    submit: 'Listo',
    onOpen: async (form) => {
      const copy = (txt, msg) => navigator.clipboard?.writeText(txt).then(() => toast(msg), () => toast('No pude copiar'));
      $('#cpCode', form).onclick = () => copy(prettyCode(code), 'Código copiado');
      $('#cpLink', form).onclick = () => copy(link, 'Link copiado');
      try {
        const qrcode = await loadQR();
        const qr = qrcode(0, 'M'); qr.addData(link); qr.make();
        $('#qrBox', form).innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
      } catch { $('#qrBox', form).innerHTML = '<span class="hint">No pude generar el QR: usá el código.</span>'; }
    },
  });
}
function linkForm(prefill = '') {
  openModal({
    title: 'Vincular con mi código',
    body: `
      <p class="prose">Escribí el código que te dio tu otro dispositivo. <b>Los datos de este dispositivo se reemplazan</b> por los de la nube.</p>
      <label class="field"><span>Código</span><input class="input code-input num" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" value="${esc(prettyCode(prefill))}" autofocus></label>`,
    submit: 'Vincular',
    onSubmit: (fd) => {
      const c = cleanCode(fd.get('code'));
      if (c.length < 12) { toast('Ese código está incompleto'); return false; }
      linkSync(c);
    },
  });
}
async function linkSync(code) {
  toast('Buscando tus datos…');
  const prev = S.sync;
  S.sync = { code, etag: null, dirty: false, base: null, last: null };
  syncKey = null;
  try {
    await deriveSync(code);
    const remote = await apiGet();
    if (!remote) throw new Error('vacio');
    const data = await decryptDoc(remote.doc);
    snapshot();
    applyData(data);
    Object.assign(S.sync, { etag: remote.etag, base: idsOf(S), last: new Date().toISOString() });
    persist(); setSyncState('ok'); render();
    toast('¡Listo! Este dispositivo quedó vinculado');
  } catch (e) {
    S.sync = prev; syncKey = null; persist();
    setSyncState(prev?.code ? 'ok' : 'off');
    toast(e.message === 'vacio' ? 'No hay datos con ese código' : e.message === 'clave' ? 'Código incorrecto' : 'No pude conectar. Revisá internet.');
  }
}

/* =========================================================
   Eventos globales
   ========================================================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const id = el.dataset.id;
  switch (a) {
    case 'new-tx': txForm(); break;
    case 'edit-tx': { const t = S.txs.find((x) => x.id === id); if (t) txForm(t); break; }
    case 'close-modal': closeModal(); break;
    case 'view-cur': S.settings.view = el.dataset.cur; save(); render(); break;
    case 'toggle-theme': {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      S.settings.theme = dark ? 'light' : 'dark'; save(); render(); break;
    }
    case 'set-theme': S.settings.theme = el.dataset.v; save(); render(); break;
    case 'toggle-table': S.ui.table = !S.ui.table; save(); render(); break;
    case 'explain-available':
      openModal({ title: '¿Cómo se calcula?', body: '<div class="prose"><p>Es todo lo que tenés <b>menos</b> lo que tenés que pagar hasta fin de mes, <b>más</b> lo que te tienen que pagar en ese tiempo.</p><p>Es la plata que podés usar sin quedarte corto con tus vencimientos.</p></div>', submit: 'Entendido' });
      break;
    case 'filter-account': Object.assign(S.ui, { account: id, cat: 'all', type: 'all', q: '' }); save(); location.hash = '#movimientos'; break;
    case 'filter-cat': Object.assign(S.ui, { cat: id, account: 'all', type: 'gasto', q: '', period: 'month' }); save(); hideTip(); location.hash = '#movimientos'; break;
    case 'f-type': S.ui.type = el.dataset.v; save(); $$('[data-action="f-type"]').forEach((b) => b.classList.toggle('on', b === el)); updateTxList(); break;
    case 'clear-filters': Object.assign(S.ui, { q: '', type: 'all', account: 'all', cat: 'all', sort: 'date-desc', group: 'day', more: false }); save(); render(); break;
    case 'export-csv': exportCSV(filteredTxs()); break;
    case 'export-csv-all': exportCSV([...S.txs].sort((x, y) => y.date.localeCompare(x.date))); break;
    case 'p-tab': S.ui.ptab = el.dataset.v; save(); render(); break;
    case 'new-pending': pendingForm(null, !!el.dataset.cuotas, el.dataset.preset || ''); break;
    case 'edit-pending': { const p = S.pendings.find((x) => x.id === id); if (p) pendingForm(p); break; }
    case 'pay-pending': payPending(id); break;
    case 'reopen-pending': {
      const p = S.pendings.find((x) => x.id === id);
      if (!p) break;
      snapshot();
      S.txs = S.txs.filter((t) => t.id !== p.txId);
      p.done = false; p.txId = null;
      save(); render(); toast('Volvió a pendientes (y borré el movimiento)', true);
      break;
    }
    case 'new-account': accountForm(); break;
    case 'edit-account': accountForm(acc(id)); break;
    case 'delete-account': if (acc(id)) deleteAccount(acc(id)); break;
    case 'more-filters': S.ui.more = !S.ui.more; save(); render(); break;
    case 'sync-balance': syncForm(id); break;
    case 'paste-notif': pasteForm(); break;
    case 'new-cat': catForm(null, el.dataset.kind); break;
    case 'edit-cat': catForm(cat(id)); break;
    case 'new-goal': goalForm(); break;
    case 'edit-goal': goalForm(S.goals.find((g) => g.id === id)); break;
    case 'goal-add': apartarForm({ goalId: id, title: 'Sumar a la meta' }); break;
    case 'goal-emergency': { const pl = planInfo(); goalForm(null, { name: 'Fondo de emergencia', emoji: 'img/salvavidas.png', target: Math.max(100000, Math.round((pl.avgExpense * 3) / 100000) * 100000) }); break; }
    case 'plan-set': S.plan = { ...S.plan, rate: Number(el.dataset.v) }; save(); render(); toast(`Listo: vas a apartar el ${el.dataset.v}% de lo que te entra`); break;
    case 'plan-rate': planRateForm(); break;
    case 'plan-apartar': { const pl = planInfo(); apartarForm({ suggest: Math.max(0, pl.target - pl.saved) }); break; }
    case 'set-space': S.ui.space = el.dataset.v; S.ui.account = 'all'; save(); render(); break;
    case 'new-space': spaceForm(); break;
    case 'pay-owner': ownerPayForm(); break;
    case 'summary': summaryModal(el.dataset.mk || undefined); break;
    case 'capt-enable': Capt()?.openSettings(); toast('Activá “Pulso” en la lista y volvé a la app'); break;
    case 'capt-toggle': S.settings.autoCapture = S.settings.autoCapture === false; persist(); captureCard(); if (S.settings.autoCapture !== false) importCaptured(); toast(S.settings.autoCapture === false ? 'Carga automática en pausa' : 'Carga automática activa'); break;
    case 'edit-space': spaceForm(spaceById(id)); break;
    case 'move': {
      const arr = el.dataset.kind === 'acc' ? S.accounts : S.categories;
      const i = arr.findIndex((x) => x.id === id);
      const item = arr[i];
      const dir = Number(el.dataset.dir);
      let j = i + dir;
      if (el.dataset.kind === 'cat') { while (arr[j] && arr[j].kind !== item.kind) j += dir; }
      if (!arr[j]) break;
      arr.splice(i, 1); arr.splice(j, 0, item);
      save(); render();
      break;
    }
    case 'fetch-usd': fetchUsd(); break;
    case 'sync-on': enableSync(); break;
    case 'sync-link': linkForm(); break;
    case 'sync-now': syncNow(true); break;
    case 'sync-code': showCode(); break;
    case 'sync-off': confirmBox('Desconectar este dispositivo', 'Tus datos quedan en este dispositivo y en la nube, pero este dispositivo deja de sincronizarse.', 'Desconectar', disableSync); break;
    case 'go-sync': location.hash = '#ajustes'; break;
    case 'rem-toggle': S.settings.reminders = S.settings.reminders === false; persist(); scheduleReminders(); render(); toast(S.settings.reminders === false ? 'Avisos apagados' : 'Avisos prendidos'); break;
    case 'rem-test': testReminder(); break;
    case 'export-json': download(`pulso-backup-${todayISO()}.json`, JSON.stringify({ ...S, sync: undefined }, null, 2), 'application/json'); toast('Copia descargada'); break;
    case 'import-json': $('#importFile').click(); break;
    case 'load-demo': confirmBox('Cargar datos de ejemplo', 'Esto <b>reemplaza</b> tus datos actuales por datos de ejemplo. Podés deshacerlo enseguida.', 'Cargar ejemplo', () => { snapshot(); const keep = S.settings; replaceState(seedDemo()); S.settings = keep; save(); render(); toast('Datos de ejemplo cargados', true); }); break;
    case 'wipe': confirmBox('Borrar todo', 'Se borran <b>todas</b> tus cuentas, movimientos, pendientes y metas de este dispositivo.', 'Borrar todo', () => { snapshot(); replaceState(emptyState()); save(); render(); toast('Todo borrado', true); }); break;
    case 'start-empty': confirmBox('Empezar con tus datos', 'Borro los datos de ejemplo y te dejo dos cuentas vacías (Brubank y Efectivo) con las categorías listas. Después podés sincronizar el saldo real.', 'Empezar', () => { snapshot(); replaceState(emptyState()); save(); location.hash = '#ajustes'; render(); toast('¡Listo! Ahora sincronizá tus saldos', true); }); break;
  }
});

$('#importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.accounts) || !Array.isArray(data.txs)) throw new Error('formato');
    snapshot(); delete data.sync; replaceState(data); save(); render(); toast('Copia restaurada', true);
  } catch { toast('Ese archivo no es una copia de Pulso'); }
});

$('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

document.addEventListener('keydown', (e) => {
  if (modal().open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/input|textarea|select/i.test(document.activeElement?.tagName)) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); txForm(); }
  if (e.key === '/' && currentView === 'movimientos') { e.preventDefault(); $('#q')?.focus(); }
});

let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => drawMonthly($('#monthlyChart')), 150); });
window.addEventListener('hashchange', route);
// si otra pestaña (por ejemplo la simulación del reloj) cambió los datos, los recargo
window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  const next = loadState();
  if (!next) return;
  S = next; migrate(); lastDataHash = dataSig(); render();
  if (S.sync?.dirty) syncNow();
});
if (matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => render());

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !NATIVE) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* =========================================================
   APP ANDROID (Capacitor): avisos de vencimientos en el celular
   (Mi Fitness los reenvía a la banda con vibración)
   ========================================================= */
const Notif = () => window.Capacitor?.Plugins?.LocalNotifications;
let remTimer = null;
function remindersSoon() { if (!NATIVE) return; clearTimeout(remTimer); remTimer = setTimeout(scheduleReminders, 1200); }
const numId = (s, k) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 100000000) * 10 + k; };
async function notifAllowed(LN) {
  const perm = await LN.checkPermissions();
  if (perm.display === 'granted') return true;
  return (await LN.requestPermissions()).display === 'granted';
}
async function scheduleReminders() {
  const LN = Notif();
  if (!LN) return;
  try {
    const pend = await LN.getPending();
    if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    if (S.settings.reminders === false || !(await notifAllowed(LN))) return;
    const hour = S.settings.remindHour ?? 9;
    const now = Date.now();
    const list = [];
    for (const p of openPendings()) {
      const cur = pCur(p);
      for (const [k, before] of [[1, 1], [2, 0]]) {
        const d = parseISO(p.due);
        d.setDate(d.getDate() - before);
        d.setHours(hour, 0, 0, 0);
        if (d.getTime() <= now || d.getTime() - now > 62 * 86400000) continue;
        const verb = p.kind === 'cobrar' ? 'cobrás' : 'vence';
        list.push({
          id: numId(p.id, k), channelId: 'vencimientos', smallIcon: 'ic_stat_pulso', actionTypeId: 'PULSO_PEND', extra: { pid: p.id },
          title: `${before ? 'Mañana' : 'Hoy'} ${verb}: ${p.name}`, body: `${fmt(p.amount, cur)} · ${accName(p.accountId)}`,
          schedule: { at: d }, isExactNotification: false,
        });
      }
    }
    list.sort((a, b) => a.schedule.at - b.schedule.at);
    if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
  } catch (e) { console.warn('avisos', e); }
}
async function testReminder() {
  const LN = Notif();
  if (!LN || !(await notifAllowed(LN))) { toast('Activá los permisos de notificaciones para Pulso'); return; }
  const p = openPendings().find((x) => x.kind === 'pagar');
  await LN.schedule({ notifications: [{
    id: 999999991, channelId: 'vencimientos', smallIcon: 'ic_stat_pulso', actionTypeId: 'PULSO_PEND', extra: { pid: p?.id || '' },
    title: p ? `Mañana vence: ${p.name}` : 'Pulso funciona ✓', body: p ? `${fmt(p.amount, pCur(p))} · ${accName(p.accountId)}` : 'Así te van a llegar los avisos',
    schedule: { at: new Date(Date.now() + 5000) }, isExactNotification: false,
  }] });
  toast('En unos segundos te llega un aviso de prueba (mirá también la banda)');
}
function remindersCard() {
  const on = S.settings.reminders !== false;
  return `<section class="card">
    <div class="card-head"><h2 class="h-ico">${ico('img/campana.png', 'sm')}Avisos en el celular</h2></div>
    <p class="prose" style="margin-bottom:12px">Te aviso <b>un día antes y el mismo día</b> de cada vencimiento. Si la banda está conectada a Mi Fitness, el aviso también vibra en la muñeca, con botón <b>“Ya pagué”</b>.</p>
    <div class="set-row"><div class="main-col"><div class="title">Avisos de vencimientos</div><div class="meta">${on ? 'Prendidos' : 'Apagados'}</div></div>
      <button type="button" class="btn small ${on ? '' : 'primary'}" data-action="rem-toggle">${on ? 'Apagar' : 'Prender'}</button></div>
    <div class="set-row"><div class="main-col"><div class="title">Hora del aviso</div></div>
      <select class="select" id="remHour">${[7, 8, 9, 10, 12, 18, 20].map((h) => `<option value="${h}" ${(S.settings.remindHour ?? 9) === h ? 'selected' : ''}>${h}:00</option>`).join('')}</select></div>
    <div class="btn-row" style="margin-top:10px"><button type="button" class="btn small" data-action="rem-test">${ico('img/campana.png', 'xs')}Probar aviso</button></div>
  </section>`;
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'remHour') { S.settings.remindHour = Number(e.target.value); persist(); scheduleReminders(); toast(`Te aviso a las ${e.target.value}:00`); }
});
async function initNative() {
  document.documentElement.classList.add('native');
  const LN = Notif();
  if (!LN) return;
  try {
    await LN.createChannel?.({ id: 'vencimientos', name: 'Vencimientos', description: 'Avisos de pagos pendientes', importance: 4, vibration: true });
    await LN.registerActionTypes({ types: [{ id: 'PULSO_PEND', actions: [{ id: 'pagado', title: 'Ya pagué' }, { id: 'luego', title: 'Luego' }] }] });
    LN.addListener('localNotificationActionPerformed', (ev) => {
      const pid = ev.notification?.extra?.pid;
      if (ev.actionId === 'pagado' && pid && S.pendings.some((x) => x.id === pid && !x.done)) payPending(pid);
      else if (ev.actionId !== 'luego') location.hash = '#pendientes';
    });
  } catch (e) { console.warn('avisos', e); }
  scheduleReminders();
}
if (NATIVE) { initNative(); initCapture(); }

lastDataHash = dataSig();
fetchCardRate();
persist(); // deja los datos guardados desde el primer uso (la simulación del reloj los lee)
route();
setSyncState(S.sync?.code ? 'ok' : 'off');
if (S.sync?.code) syncNow();
let lastFocusSync = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.sync?.code && Date.now() - lastFocusSync > 15000) { lastFocusSync = Date.now(); syncNow(); }
});
window.addEventListener('online', () => { if (S.sync?.code) syncNow(); });
