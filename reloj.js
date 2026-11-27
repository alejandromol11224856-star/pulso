/* Simulación de Pulso en la Xiaomi Smart Band 10 Pro.
   Usa los MISMOS datos que la app (localStorage 'pulso.v1'): lo que registres acá aparece en Pulso
   y, si tenés la sincronización activada, se sube a la nube la próxima vez que abras Pulso. */
'use strict';
const KEY = 'pulso.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toISO(new Date());
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const days = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
function addMonths(iso, n) { const d = parseISO(iso); const day = d.getDate(); const t = new Date(d.getFullYear(), d.getMonth() + n, 1); t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return toISO(t); }
const isImg = (v) => /^(img\/|https?:\/\/|data:image\/)/.test(v || '');
const imgOf = (v, fb = 'img/bolsa-plata.png') => (isImg(v) ? v : fb);

let S = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function persist() {
  if (S.sync?.code) S.sync.dirty = true; // Pulso lo sube a la nube al abrirse
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* sin almacenamiento */ }
}
if (S?.settings?.theme === 'light') document.documentElement.dataset.theme = 'light';

const usd = () => S.settings?.usd || 1;
const accOf = (id) => S.accounts.find((a) => a.id === id);
const catOf = (id) => S.categories.find((c) => c.id === id);
const toARS = (c, cur) => (cur === 'USD' ? Math.round(c * usd()) : c);
const money = (cents, cur = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(cents / 100);
function balances() {
  const b = {};
  S.accounts.forEach((a) => { b[a.id] = a.initial || 0; });
  S.txs.forEach((t) => {
    if (!(t.accountId in b)) return;
    if (t.type === 'ingreso' || t.type === 'ajuste') b[t.accountId] += t.amount;
    else if (t.type === 'gasto') b[t.accountId] -= t.amount;
    else if (t.type === 'transferencia') { b[t.accountId] -= t.amount; if (t.toAccountId in b) b[t.toAccountId] += t.toAmount ?? t.amount; }
  });
  return b;
}
const total = () => { const b = balances(); return S.accounts.reduce((s, a) => s + toARS(b[a.id], a.currency), 0); };
const spentToday = () => S.txs.filter((t) => t.type === 'gasto' && t.date === today()).reduce((s, t) => s + toARS(t.amount, accOf(t.accountId)?.currency), 0);
const openPend = () => (S.pendings || []).filter((p) => !p.done).sort((a, b) => a.due.localeCompare(b.due));
function monthBudgetPct() {
  const mk = today().slice(0, 7);
  const lim = Object.values(S.budgets || {}).reduce((s, v) => s + v, 0);
  if (!lim) return null;
  const spent = S.txs.filter((t) => t.type === 'gasto' && t.date.startsWith(mk) && S.budgets[t.categoryId]).reduce((s, t) => s + toARS(t.amount, accOf(t.accountId)?.currency), 0);
  return Math.round((spent / lim) * 100);
}
/** Categorías más usadas en los últimos 60 días primero. */
function topCats(kind) {
  const since = toISO(new Date(Date.now() - 60 * 86400000));
  const count = {};
  S.txs.forEach((t) => { if (t.date >= since && t.categoryId) count[t.categoryId] = (count[t.categoryId] || 0) + 1; });
  return S.categories.filter((c) => c.kind === kind).sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0));
}
function buzz() { const d = $('#device'); d.classList.remove('buzz'); void d.offsetWidth; d.classList.add('buzz'); try { navigator.vibrate?.(35); } catch { /* */ } }

/* ---------- Navegación entre pantallas ---------- */
const screen = $('#screen');
let stack = [{ name: 'face' }];
const go = (name, p = {}) => { stack.push({ name, p }); draw('fwd'); };
function back() { if ($('#notif').hidden === false) { hideNotif(); return; } if (stack.length > 1) { stack.pop(); draw('back'); } }
function home() { hideNotif(); stack = [{ name: 'face' }]; draw('back'); }

const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const V = {
  face() {
    const d = new Date();
    const pct = monthBudgetPct();
    const date = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
    return `<div class="face">
      <div class="date">${esc(date)}</div>
      <div class="time" id="clock">${pad(d.getHours())}:${pad(d.getMinutes())}</div>
      <div class="comps">
        <button class="comp" data-go="app"><div class="k">Hoy</div><div class="v">${money(spentToday())}</div></button>
        <button class="comp" data-go="app"><div class="k">Presupuesto</div><div class="v">${pct === null ? '—' : pct + '%'}</div></button>
        <button class="comp app" data-go="app"><img src="icon-192.png" alt="">Pulso</button>
      </div>
    </div>`;
  },
  app() {
    const n = openPend().length;
    return `<p class="w-title">Pulso</p>
      <div class="balance"><div class="k">Disponible</div><div class="v">${money(total())}</div></div>
      <button class="big-btn red" data-go="cats" data-type="gasto"><img src="img/billete.png" alt=""><span class="grow">Gasto</span></button>
      <button class="big-btn green" data-go="cats" data-type="ingreso"><img src="img/bolsa-plata.png" alt=""><span class="grow">Ingreso</span></button>
      <button class="big-btn" data-go="pend"><img src="img/calendario.png" alt=""><span class="grow">Pendientes</span>${n ? `<span class="cnt">${n}</span>` : ''}</button>
      <button class="big-btn" data-go="accs"><img src="img/banco.png" alt=""><span class="grow">Cuentas</span></button>`;
  },
  cats({ type }) {
    const list = topCats(type);
    return `<p class="w-title">${type === 'ingreso' ? 'Ingreso' : 'Gasto'}</p>
      <div class="cats">${list.map((c) => `<button class="cat" data-pick-cat="${c.id}"><img src="${esc(imgOf(c.emoji))}" alt="">${esc(c.name)}</button>`).join('')}</div>`;
  },
  amount({ type, catId, value = '' }) {
    const c = catOf(catId);
    const v = value ? Number(value) * 100 : 0;
    return `<p class="w-sub">${esc(c?.name || '')}</p>
      <div class="amount ${value ? '' : 'empty'}" id="amt">${value ? money(v) : '$ 0'}</div>
      <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button class="key" data-key="${k}">${k}</button>`).join('')}
        <button class="key" data-key="del" aria-label="Borrar">⌫</button><button class="key" data-key="0">0</button>
        <button class="key ok" data-key="ok" ${value ? '' : 'disabled'} aria-label="Confirmar">✓</button></div>`;
  },
  accs({ pick } = {}) {
    const b = balances();
    return `<p class="w-title">${pick ? '¿De qué cuenta?' : 'Cuentas'}</p>
      ${S.accounts.map((a) => `<button class="big-btn ${/logo-|^https?:/.test(a.emoji) ? 'logo' : ''}" ${pick ? `data-pick-acc="${a.id}"` : ''}>
        <img src="${esc(imgOf(a.emoji, 'img/banco.png'))}" alt=""><span class="grow">${esc(a.name)}<small>${money(b[a.id], a.currency)}</small></span></button>`).join('')}`;
  },
  pend() {
    const list = openPend().slice(0, 8);
    if (!list.length) return '<p class="w-title">Pendientes</p><p class="empty-w">¡No tenés nada pendiente! 🎉</p>';
    return `<p class="w-title">Pendientes</p>${list.map((p) => {
      const d = days(today(), p.due);
      const when = d < 0 ? `Venció hace ${-d} d` : d === 0 ? 'Vence hoy' : d === 1 ? 'Mañana' : `En ${d} días`;
      const logo = findLogo(p.name);
      return `<button class="big-btn ${logo ? 'logo' : ''}" data-go="pendOne" data-id="${p.id}"><img src="${esc(logo || imgOf(catOf(p.categoryId)?.emoji, 'img/recibo.png'))}" alt="">
        <span class="grow">${esc(p.name)}<small>${when} · ${money(p.amount, p.cur || accOf(p.accountId)?.currency)}</small></span></button>`;
    }).join('')}`;
  },
  pendOne({ id }) {
    const p = S.pendings.find((x) => x.id === id);
    if (!p) return '<p class="empty-w">Ya no está</p>';
    return `<p class="w-title">${esc(p.name)}</p>
      <div class="balance"><div class="k">${p.kind === 'cobrar' ? 'Te tienen que pagar' : 'Tenés que pagar'}</div><div class="v">${money(p.amount, p.cur || accOf(p.accountId)?.currency)}</div></div>
      <button class="big-btn green" data-pay="${p.id}">${ICON_CHECK.replace('<svg', '<svg style="width:40px;height:40px;stroke:#3fbf3f;stroke-width:3"')}<span class="grow">${p.kind === 'cobrar' ? 'Ya lo cobré' : 'Ya lo pagué'}</span></button>
      <button class="big-btn" data-back><span class="grow" style="text-align:center">Más tarde</span></button>`;
  },
  done({ title, line }) {
    return `<div class="done"><div class="ring">${ICON_CHECK}</div><h3>${esc(title)}</h3><p>${esc(line)}</p></div>`;
  },
};

/* logos conocidos (mismo criterio que la app, versión corta) */
const LOGO_WORDS = { netflix: 'netflix', spotify: 'spotify', youtube: 'youtube', disney: 'disney', telecentro: 'telecentro', edenor: 'edenor', edesur: 'edesur', metrogas: 'metrogas', aysa: 'aysa', personal: 'personal', movistar: 'movistar', claro: 'claro', sube: 'sube', mostaza: 'mostaza', rappi: 'rappi', uber: 'uber', brubank: 'brubank', coto: 'coto', carrefour: 'carrefour', ypf: 'ypf', chatgpt: 'chatgpt', claude: 'claude' };
function findLogo(text) {
  const w = ` ${String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ')} `;
  const k = Object.keys(LOGO_WORDS).find((x) => w.includes(` ${x} `));
  return k ? `img/logo-${LOGO_WORDS[k]}.png` : null;
}

function draw(dir = 'fwd') {
  const { name, p = {} } = stack[stack.length - 1];
  screen.innerHTML = V[name](p);
  screen.className = `screen ${dir}`;
  screen.scrollTop = 0;
}

/* ---------- Acciones ---------- */
function saveTx({ type, catId, value, accId }) {
  const amount = Math.round(Number(value) * 100);
  const c = catOf(catId);
  S.txs.push({ id: uid(), date: today(), type, amount, desc: c?.name || (type === 'ingreso' ? 'Ingreso' : 'Gasto'), categoryId: catId, accountId: accId, note: 'Cargado desde el reloj' });
  persist();
  buzz();
  stack = [{ name: 'face' }, { name: 'app' }];
  stack.push({ name: 'done', p: { title: type === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado', line: `${money(amount, accOf(accId)?.currency)} · ${c?.name || ''} · ${accOf(accId)?.name || ''}` } });
  draw('fwd');
  setTimeout(() => { if (stack[stack.length - 1].name === 'done') { stack.pop(); draw('back'); } }, 2200);
}
function payPending(id) {
  const p = S.pendings.find((x) => x.id === id);
  if (!p) return;
  const ac = accOf(p.accountId)?.currency || 'ARS';
  // en dólares pagado desde una cuenta en pesos: estimado con dólar tarjeta (en el celu se corrige el monto exacto)
  const amount = (p.cur || ac) === ac ? p.amount : (p.cur === 'USD' ? Math.round(p.amount * (S.settings.usdCard || S.settings.usd)) : Math.round(p.amount / S.settings.usd));
  const tx = { id: uid(), date: today(), type: p.kind === 'cobrar' ? 'ingreso' : 'gasto', amount, desc: p.of ? `${p.name} (cuota ${p.n}/${p.of})` : p.name, categoryId: p.categoryId, accountId: p.accountId, fromPending: p.id, note: 'Cargado desde el reloj' };
  S.txs.push(tx);
  Object.assign(p, { done: true, doneAt: today(), txId: tx.id, paidAmount: amount });
  const step = { monthly: (d) => addMonths(d, 1), weekly: (d) => toISO(new Date(parseISO(d).getTime() + 7 * 86400000)), yearly: (d) => addMonths(d, 12) }[p.repeat];
  if (step) S.pendings.push({ ...JSON.parse(JSON.stringify(p)), id: uid(), due: step(p.due), done: false, doneAt: null, txId: null, paidAmount: undefined });
  persist();
  buzz();
  stack = [{ name: 'face' }, { name: 'app' }, { name: 'pend' }, { name: 'done', p: { title: p.kind === 'cobrar' ? 'Cobrado' : 'Pagado', line: `${p.name} · ${money(amount, ac)}` } }];
  draw('fwd');
  setTimeout(() => { if (stack[stack.length - 1].name === 'done') { stack.pop(); draw('back'); } }, 2200);
}

screen.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t || dragged) return;
  const top = stack[stack.length - 1];
  if (t.dataset.go) return go(t.dataset.go, { type: t.dataset.type, id: t.dataset.id });
  if (t.dataset.pickCat) return go('amount', { type: top.p.type, catId: t.dataset.pickCat, value: '' });
  if (t.dataset.key) {
    let v = top.p.value || '';
    const k = t.dataset.key;
    if (k === 'ok') { if (v) go('accs', { ...top.p, pick: true }); return; }
    if (k === 'del') v = v.slice(0, -1); else if (v.length < 9 && !(v === '' && k === '0')) v += k;
    top.p.value = v;
    draw('none');
    return;
  }
  if (t.dataset.pickAcc) return saveTx({ ...top.p, accId: t.dataset.pickAcc });
  if (t.dataset.pay) return payPending(t.dataset.pay);
  if ('back' in t.dataset) back();
});

/* deslizar a la derecha = volver (como en el reloj) */
let sx = 0, sy = 0, dragged = false;
screen.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; dragged = false; });
screen.addEventListener('pointerup', (e) => {
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (dx > 60 && Math.abs(dy) < 50) { dragged = true; back(); setTimeout(() => { dragged = false; }, 50); }
});

$('#sideBtn').addEventListener('click', () => { buzz(); stack.length > 1 ? home() : go('app'); });
$$('[data-ctl]').forEach((b) => b.addEventListener('click', () => {
  const c = b.dataset.ctl;
  if (c === 'back') back();
  if (c === 'home') { buzz(); stack.length > 1 ? home() : go('app'); }
  if (c === 'notif') showNotif();
}));

/* ---------- Aviso de vencimiento (lo que llegaría al reloj desde el celular) ---------- */
function showNotif() {
  const p = openPend().find((x) => x.kind === 'pagar') || openPend()[0];
  const n = $('#notif');
  if (!p) { n.innerHTML = '<div class="app"><img src="icon-192.png" alt="">Pulso</div><h4>Todo al día</h4><p>No tenés vencimientos 🎉</p>'; }
  else {
    const d = days(today(), p.due);
    const when = d < 0 ? 'Venció' : d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`;
    n.innerHTML = `<div class="app"><img src="icon-192.png" alt="">Pulso · ahora</div>
      <h4>${when}: ${esc(p.name)}</h4><p>${money(p.amount, p.cur || accOf(p.accountId)?.currency)} · ${esc(accOf(p.accountId)?.name || '')}</p>
      <div class="acts"><button data-n="later">Luego</button><button class="pay" data-n="pay">${p.kind === 'cobrar' ? 'Cobrado' : 'Pagado'}</button></div>`;
    n.querySelector('[data-n="pay"]').onclick = () => { hideNotif(); payPending(p.id); };
    n.querySelector('[data-n="later"]').onclick = hideNotif;
  }
  n.hidden = false;
  buzz();
  clearTimeout(showNotif.t);
  showNotif.t = setTimeout(hideNotif, 9000);
}
function hideNotif() { $('#notif').hidden = true; }

/* ---------- Escala para que entre en el celular ---------- */
function fit() {
  const dev = $('#device');
  const avail = Math.min(window.innerWidth - 32, 460);
  const sc = Math.min(1, avail / 396);
  dev.style.setProperty('--sc', sc);
  $('#fit').style.height = `${dev.getBoundingClientRect().height}px`;
}
window.addEventListener('resize', fit);
fit();

/* reloj en vivo */
setInterval(() => { const c = $('#clock'); if (c) { const d = new Date(); c.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; } }, 1000);

if (!S || !Array.isArray(S.accounts)) {
  screen.innerHTML = '<p class="empty-w" style="padding:0 10px">Abrí Pulso una vez en este navegador para cargar tus datos.<br><br><a href="./" style="color:#3987e5">Abrir Pulso</a></p>';
} else {
  draw('none');
}
