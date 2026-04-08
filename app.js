const API_BASE = 'http://127.0.0.1:8000';

/* State */
let currentUser = localStorage.getItem('petcare_user') || null;

/* Helpers */
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

function showAlert(type, message, container = document.body) {
  const el = document.createElement('div');
  el.className = `alert ${type === 'success' ? 'alert-success' : 'alert-error'}`;
  el.textContent = message;
  // Place at top of main content
  const main = qs('.main-content') || container;
  main.prepend(el);
  setTimeout(() => el.remove(), 3500);
}

/* Navigation / Tabs */
function lockProtectedTabs() {
  qsa('.nav-item').forEach(btn => {
    const tab = btn.dataset.tab;
    if (['servicios','mascotas','reporte'].includes(tab)) {
      btn.classList.add('locked');
      btn.setAttribute('data-locked','true');
    }
  });
}

function unlockProtectedTabs() {
  qsa('.nav-item').forEach(btn => {
    const tab = btn.dataset.tab;
    if (['servicios','mascotas','reporte'].includes(tab)) {
      btn.classList.remove('locked');
      btn.removeAttribute('data-locked');
    }
  });
}

function setNavActive(tabName) {
  qsa('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
}

function switchTab(name) {
  // hide all sections
  qsa('.section').forEach(s => s.classList.remove('active'));
  // show the requested
  const target = qs(`#${name}`);
  if (target) target.classList.add('active');
  setNavActive(name);

  // special behaviors
  if (name === 'servicios') loadServices();
  if (name === 'mascotas') {
    if (currentUser) loadPets(currentUser);
  }
  if (name === 'reporte') {
    const emailInput = qs('#report-email');
    if (currentUser && emailInput) emailInput.value = currentUser;
    if (currentUser) loadReport(currentUser);
  }
}

/* Auth */
async function registerUser(formData) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error('Registro fallido');
    showAlert('success','Registro completado');
  } catch (err) { showAlert('error', err.message); }
}

async function loginUser(formData) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Login fallido');
    }
    // assume success response doesn't need token for this exercise
    currentUser = formData.correo;
    localStorage.setItem('petcare_user', currentUser);
    onLogin();
    showAlert('success', 'Inicio de sesión correcto');
  } catch (err) { showAlert('error', err.message); }
}

function onLogin() {
  unlockProtectedTabs();
  updateUserBadge();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('petcare_user');
  lockProtectedTabs();
  updateUserBadge();
  switchTab('acceso');
}

function updateUserBadge() {
  const badgeName = qs('.user-name');
  const badgeRole = qs('.user-role');
  const logoutBtn = qs('.btn-logout');
  if (currentUser) {
    if (badgeName) badgeName.textContent = currentUser;
    if (badgeRole) badgeRole.textContent = 'Conectado';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  } else {
    if (badgeName) badgeName.textContent = 'Usuario';
    if (badgeRole) badgeRole.textContent = 'Visitante';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

/* Services */
async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/servicios`);
    if (!res.ok) throw new Error('No se pudo cargar servicios');
    const data = await res.json();
    renderServices(data.servicios || []);
  } catch (err) { showAlert('error', err.message); }
}

function renderServices(items) {
  const list = qs('#services-list');
  const select = qs('#pet-service');
  if (list) { list.innerHTML = ''; items.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.nombre} — $${Number(s.precio).toFixed(2)}`;
    list.appendChild(li);
  }); }
  if (select) {
    // clear except first placeholder
    select.innerHTML = '<option value="">Seleccione un servicio</option>';
    items.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nombre;
      opt.textContent = `${s.nombre} — $${Number(s.precio).toFixed(2)}`;
      select.appendChild(opt);
    });
  }
}

async function addService(formData) {
  try {
    const res = await fetch(`${API_BASE}/agregar-servicio`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error('No se pudo agregar servicio');
    showAlert('success','Servicio agregado');
    loadServices();
  } catch (err) { showAlert('error', err.message); }
}

/* Pets */
async function registerPet(formData) {
  try {
    const res = await fetch(`${API_BASE}/registrar-mascota`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error('No se pudo registrar mascota');
    showAlert('success','Mascota registrada');
    if (currentUser) loadPets(currentUser);
  } catch (err) { showAlert('error', err.message); }
}

async function loadPets(correo) {
  try {
    const res = await fetch(`${API_BASE}/mascotas/${encodeURIComponent(correo)}`);
    if (!res.ok) throw new Error('No se pudieron cargar mascotas');
    const data = await res.json();
    renderPets(data.mascotas || []);
  } catch (err) { showAlert('error', err.message); }
}

function renderPets(items) {
  const list = qs('#pets-list');
  if (!list) return;
  list.innerHTML = '';
  items.forEach(p => {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `<strong>${p.nombre}</strong><div class="muted">Servicio: ${p.tipo_servicio}</div><div class="muted">Fecha: ${p.fecha}</div><div class="muted">Correo: ${p.correo}</div>`;
    list.appendChild(li);
  });
}

/* Report */
async function loadReport(correo) {
  try {
    const res = await fetch(`${API_BASE}/reporte/${encodeURIComponent(correo)}`);
    if (!res.ok) throw new Error('No se pudo obtener reporte');
    const data = await res.json();
    renderReport(data);
  } catch (err) { showAlert('error', err.message); }
}

function renderReport(data = {}) {
  const container = qs('#report-results');
  if (!container) return;
  container.innerHTML = '';

  const stats = document.createElement('div');
  stats.className = 'grid';
  stats.style.gridTemplateColumns = 'repeat(3,1fr)';
  stats.style.gap = '12px';

  const box = (title, value) => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div class="muted">${title}</div><div style="font-weight:700;font-size:1.2rem">${value}</div>`;
    return el;
  };

  stats.appendChild(box('Cantidad servicios', data.cantidad_servicios ?? 0));
  stats.appendChild(box('Total gastado', `$${(data.total_gastado ?? 0).toFixed ? (data.total_gastado).toFixed(2) : data.total_gastado}`));
  stats.appendChild(box('Correo', data.correo ?? '—'));

  container.appendChild(stats);

  // services tags
  if (Array.isArray(data.servicios) && data.servicios.length) {
    const tagsWrap = document.createElement('div');
    tagsWrap.style.marginTop = '12px';
    data.servicios.forEach(s => {
      const t = document.createElement('span');
      t.textContent = s;
      t.style.display = 'inline-block';
      t.style.padding = '6px 10px';
      t.style.margin = '6px 6px 0 0';
      t.style.background = '#eef7f6';
      t.style.borderRadius = '999px';
      t.style.fontWeight = '600';
      tagsWrap.appendChild(t);
    });
    container.appendChild(tagsWrap);
  }
}

/* Wiring events */
function initEventListeners() {
  // nav
  qsa('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = btn.dataset.tab;
      if (btn.classList.contains('locked')) return;
      switchTab(tab);
    });
  });

  // logout
  const logoutBtn = qs('.btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // greeting form
  const greet = qs('#greeting-form');
  if (greet) greet.addEventListener('submit', e => {
    e.preventDefault();
    const name = qs('#greeting-name').value.trim();
    if (!name) return showAlert('error','Introduce un nombre');
    fetch(`${API_BASE}/bienvenido/${encodeURIComponent(name)}`)
      .then(r=>r.json())
      .then(j=> showAlert('success', j.mensaje || `Hola ${name}`))
      .catch(()=> showAlert('error','Error al saludar'));
  });

  // register
  const reg = qs('#register-form');
  if (reg) reg.addEventListener('submit', e => {
    e.preventDefault();
    const correo = qs('#register-email').value.trim();
    const contrasena = qs('#register-password').value;
    registerUser({ correo, contrasena });
  });

  // login
  const login = qs('#login-form');
  if (login) login.addEventListener('submit', e => {
    e.preventDefault();
    const correo = qs('#login-email').value.trim();
    const contrasena = qs('#login-password').value;
    loginUser({ correo, contrasena });
  });

  // add service
  const svc = qs('#service-form');
  if (svc) svc.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = qs('#service-name').value.trim();
    const precio = Number(qs('#service-price').value);
    if (!nombre || !precio) return showAlert('error','Completa nombre y precio');
    addService({ nombre, precio });
  });

  // register pet
  const petForm = qs('#pet-form');
  if (petForm) petForm.addEventListener('submit', e => {
    e.preventDefault();
    const correo = qs('#pet-email').value.trim();
    const nombre = qs('#pet-name').value.trim();
    const tipo_servicio = qs('#pet-service').value;
    const fecha = qs('#pet-date').value;
    if (!correo || !nombre || !tipo_servicio || !fecha) return showAlert('error','Completa todos los campos');
    registerPet({ correo, nombre, tipo_servicio, fecha });
  });

  // pet search
  const petSearch = qs('#pet-search');
  if (petSearch) petSearch.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    // simple client-side filter of loaded pets
    const items = qsa('#pets-list .card');
    items.forEach(it => {
      const txt = it.textContent.toLowerCase();
      it.style.display = txt.includes(q) ? '' : 'none';
    });
  });

  // report form
  const rep = qs('#report-form');
  if (rep) rep.addEventListener('submit', e => {
    e.preventDefault();
    const correo = qs('#report-email').value.trim();
    if (!correo) return showAlert('error','Introduce un correo');
    loadReport(correo);
  });

}

/* Init */
function init() {
  // initial lock state
  if (!currentUser) lockProtectedTabs(); else unlockProtectedTabs();
  updateUserBadge();
  initEventListeners();
  // ensure nav active state matches initial visible section
  const activeSection = qs('.section.active');
  if (activeSection) setNavActive(activeSection.id);
  // preload services
  loadServices();
}

document.addEventListener('DOMContentLoaded', init);

// expose switchTab globally (requested)
window.switchTab = switchTab;
window.logout = logout;
