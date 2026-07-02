/* ============================================================
   utils.js — Global Utilities
   Toast, Modal, PDF, Date, Validation, CSV, Signature
   ============================================================ */

// ── Toast Notifications ───────────────────────────────────────
const Toast = (() => {
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function show(title, message = '', type = 'info', duration = 4000) {
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    getContainer().appendChild(toast);
    setTimeout(() => toast.style.animation = 'toast-out 0.3s ease forwards', duration);
    setTimeout(() => toast.remove(), duration + 300);
  }

  return { show, success: (t, m) => show(t, m, 'success'), error: (t, m) => show(t, m, 'error'), warning: (t, m) => show(t, m, 'warning'), info: (t, m) => show(t, m, 'info') };
})();

// ── Modal ────────────────────────────────────────────────────
const Modal = (() => {
  const modals = {};

  function create(id, { title, body, footer = '', size = '' } = {}) {
    close(id);
    const overlay = document.createElement('div');
    overlay.id = `modal-${id}`;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size ? 'modal-' + size : ''}">
        <div class="modal-header">
          <h3 class="modal-title">${title || ''}</h3>
          <button class="modal-close" onclick="Modal.close('${id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${body || ''}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(id); });
    requestAnimationFrame(() => overlay.classList.add('open'));
    modals[id] = overlay;
    document.body.style.overflow = 'hidden';
    return overlay;
  }

  function open(id) {
    const el = document.getElementById(`modal-${id}`);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }

  function close(id) {
    const el = document.getElementById(`modal-${id}`);
    if (el) { el.classList.remove('open'); setTimeout(() => el.remove(), 300); delete modals[id]; }
    if (Object.keys(modals).length === 0) document.body.style.overflow = '';
  }

  function confirm({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    create('confirm', {
      title, size: 'sm',
      body: `<p style="color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.6">${message}</p>`,
      footer: `<button class="btn btn-secondary btn-sm" onclick="Modal.close('confirm')">Cancel</button>
               <button class="btn ${confirmClass} btn-sm" id="confirm-action-btn">${confirmText}</button>`,
    });
    document.getElementById('confirm-action-btn').onclick = () => { close('confirm'); onConfirm(); };
  }

  function setBody(id, html) {
    const el = document.getElementById(`modal-${id}`);
    if (el) el.querySelector('.modal-body').innerHTML = html;
  }

  return { create, open, close, confirm, setBody };
})();

// ── Date Helpers ─────────────────────────────────────────────
const DateFmt = {
  format: (iso, fmt = 'long') => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    if (fmt === 'long') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (fmt === 'short') return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (fmt === 'time') return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (fmt === 'input') return d.toISOString().split('T')[0];
    return d.toLocaleDateString('en-IN');
  },
  relativeTime: (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return DateFmt.format(iso);
  },
  today: () => new Date().toISOString().split('T')[0],
  currentYear: () => new Date().getFullYear(),
};

// ── String Helpers ───────────────────────────────────────────
const Str = {
  initials: (name = '') => name.split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?',
  capitalize: s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '',
  truncate: (s = '', len = 60) => s.length > len ? s.slice(0, len) + '…' : s,
  escHtml: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
};

// ── Icon Helper ──────────────────────────────────────────────
const Icons = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  logOut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  department: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  check_circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  signature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17c3-3 6-5 9-2s6 5 9 2"/><path d="M3 17L7 5l5 10 3-6 5 8"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  upload2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
};

// ── Theme Toggle ─────────────────────────────────────────────
const Theme = {
  get: () => localStorage.getItem('sb_theme') || 'light',
  set: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sb_theme', theme);
  },
  toggle: () => {
    const current = Theme.get();
    Theme.set(current === 'dark' ? 'light' : 'dark');
  },
  init: () => Theme.set(Theme.get()),
};

// ── Avatar Render ─────────────────────────────────────────────
function renderAvatar(name, size = 'md', photoUrl = null, viewTransitionId = null) {
  const style = viewTransitionId ? ` style="view-transition-name: avatar-${viewTransitionId}"` : '';
  if (photoUrl) return `<img src="${photoUrl}" class="avatar avatar-${size}" alt="${Str.escHtml(name)}"${style}>`;
  return `<div class="avatar-placeholder avatar-${size}"${style}>${Str.initials(name)}</div>`;
}

// ── Status Badge ──────────────────────────────────────────────
function renderStatusBadge(status) {
  const map = {
    green: { cls: 'badge-green', label: 'On Track' },
    yellow: { cls: 'badge-yellow', label: 'Needs Attention' },
    red: { cls: 'badge-red', label: 'At Risk' },
    gray: { cls: 'badge-gray', label: 'No Data' },
  };
  const { cls, label } = map[status] || map.gray;
  return `<span class="badge ${cls}"><span class="status-dot"></span>${label}</span>`;
}

// ── Attendance Ring ──────────────────────────────────────────
function renderAttendanceRing(percent) {
  const num = parseFloat(percent) || 0;
  return `
    <div class="attendance-ring-container" style="position:relative;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;">
      <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(-90deg);display:block;">
        <circle cx="20" cy="20" r="16" stroke="var(--bg-surface-3, #e2e8f0)" stroke-width="3.5" fill="none" />
        <circle class="attendance-ring-path" data-percent="${num}" cx="20" cy="20" r="16" stroke="var(--primary-color)" stroke-width="3.5" fill="none" stroke-linecap="round" />
      </svg>
      <span style="position:absolute;font-size:10px;font-weight:bold;color:var(--text-primary)">${Math.round(num)}%</span>
    </div>
  `;
}

// ── Role Label (display names for hierarchy) ──────────────────
// Hierarchy: Admin → Principal → HOD → Teacher → Parent → Student
// Note: "mentor" role is displayed as "Teacher" (Faculty = Teacher = Mentor)
function roleLabel(role) {
  const map = {
    admin: 'Admin',
    principal: 'Principal',
    hod: 'HOD',
    mentor: 'Teacher',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
  };
  return map[role] || Str.capitalize(role);
}

// ── Role Badge ────────────────────────────────────────────────
function renderRoleBadge(role) {
  const map = {
    admin: 'badge-purple',
    principal: 'badge-purple',
    mentor: 'badge-blue',
    teacher: 'badge-blue',
    hod: 'badge-cyan',
    student: 'badge-green',
    parent: 'badge-yellow',
  };
  return `<span class="badge ${map[role] || 'badge-gray'}">${roleLabel(role)}</span>`;
}

// ── Signature Canvas ──────────────────────────────────────────
class SignatureCanvas {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = this.container?.querySelector('.signature-canvas');
    this.ctx = this.canvas?.getContext('2d');
    this.drawing = false;
    this.hasSignature = false;
    if (this.canvas) this._init();
  }

  _init() {
    const set = () => { this.canvas.width = this.canvas.offsetWidth; this.canvas.height = 120; };
    set();
    window.addEventListener('resize', set);
    this.canvas.addEventListener('mousedown', e => { this.drawing = true; this.ctx.beginPath(); this.ctx.moveTo(...this._pos(e)); });
    this.canvas.addEventListener('mousemove', e => { if (!this.drawing) return; this.ctx.lineTo(...this._pos(e)); this.ctx.strokeStyle = '#1e293b'; this.ctx.lineWidth = 2; this.ctx.lineCap = 'round'; this.ctx.stroke(); this.hasSignature = true; });
    this.canvas.addEventListener('mouseup', () => { this.drawing = false; });
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this.drawing = true; this.ctx.beginPath(); this.ctx.moveTo(...this._pos(e.touches[0])); }, { passive: false });
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!this.drawing) return; this.ctx.lineTo(...this._pos(e.touches[0])); this.ctx.strokeStyle = '#1e293b'; this.ctx.lineWidth = 2; this.ctx.lineCap = 'round'; this.ctx.stroke(); this.hasSignature = true; }, { passive: false });
    this.canvas.addEventListener('touchend', () => { this.drawing = false; });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.hasSignature = false; }

  toDataURL() { return this.hasSignature ? this.canvas.toDataURL('image/png') : null; }
}

// ── CSV Export ────────────────────────────────────────────────
function exportCSV(rows, filename = 'export.csv') {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const sanitize = val => {
    let s = String(val ?? '');
    if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@') || s.startsWith('\t') || s.startsWith('\r')) {
      s = "'" + s;
    }
    return JSON.stringify(s);
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => sanitize(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

// ── PDF Generation ────────────────────────────────────────────
const PDFGen = {
  generate: async (studentId) => {
    const student = DB.Users.getById(studentId);
    if (!student) { Toast.error('Student not found'); return; }

    const profile = DB.Profiles.get(studentId) || {};
    const course = DB.Courses.getById(student.courseId);
    const dept = DB.Departments.getById(student.departmentId);
    const mentor = (() => { const mid = DB.Assignments.getMentor(studentId); return mid ? DB.Users.getById(mid) : null; })();
    const semCount = course ? course.semesterCount : 6;
    const semRecords = DB.SemesterRecords.getAll(studentId);
    const meetings = DB.Meetings.getAll(studentId);
    const ptaMeetings = DB.PTAMeetings.getAll(studentId);
    const achievements = DB.Achievements.getAll(studentId);
    const notes = DB.MentoringNotes.getAll(studentId);
    const sig = DB.Signatures.get(studentId);
    const collegeInfo = DB.Settings.getCollegeInfo();
    // Embed the logo as a data URL so it reliably renders inside the print window
    let logoData = '';
    try {
      const resp = await fetch(new URL('../SB Logo.png', window.location.href).href);
      const blob = await resp.blob();
      logoData = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(blob); });
    } catch (e) { logoData = ''; }
    const ov = (typeof StudentReport !== 'undefined') ? StudentReport.overview(studentId) : { total: semRecords.length, passed: 0, failed: 0 };

    // Build HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mentor File — ${Str.escHtml(student.name)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; margin: 0; padding: 30px 30px; font-size: 12px; }
          .logo { height: 74px; }
          h2 { font-size: 12.5px; text-transform: uppercase; letter-spacing: 1px; color: #1e1b4b; margin: 24px 0 12px; padding: 7px 0 7px 12px; border-left: 4px solid #4F46E5; background: linear-gradient(90deg, rgba(79,70,229,0.08), rgba(79,70,229,0)); }
          h3 { font-size: 12px; font-weight: bold; margin: 10px 0 6px; }
          .header { display: flex; align-items: center; gap: 20px; padding-bottom: 14px; }
          .header .logo { height: 74px; width: auto; }
          .brand-name { font-size: 22px; font-weight: 700; color: #1e1b4b; letter-spacing: 0.2px; }
          .brand-sub { color: #6b7280; font-size: 11px; margin-top: 3px; letter-spacing: 0.3px; }
          .doc-badge { margin-left: auto; text-align: right; }
          .doc-title { font-size: 16px; font-weight: 700; color: #1e1b4b; letter-spacing: 3px; }
          .doc-year { color: #6b7280; font-size: 11px; margin-top: 3px; }
          .stamp { display: inline-block; margin-top: 6px; border: 1.5px solid #C9A227; color: #9a7b12; border-radius: 5px; padding: 2px 10px; font-size: 8.5px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: bold; }
          .rule { height: 3px; background: linear-gradient(90deg, #1e1b4b, #4F46E5 55%, #C9A227); border-radius: 2px; }
          .rule-thin { height: 1px; background: #C9A227; opacity: 0.55; margin: 3px 0 22px; }
          .summary { display: flex; gap: 12px; margin: 4px 0 8px; }
          .summary .box { flex: 1; border: 1px solid #e5e7eb; border-top: 3px solid #4F46E5; border-radius: 8px; padding: 10px 12px; text-align: center; }
          .summary .box .n { font-size: 18px; font-weight: 700; color: #1e1b4b; }
          .summary .box .l { font-size: 8.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; font-family: Arial, sans-serif; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; }
          .field { padding: 6px 0; border-bottom: 1px dotted #e5e7eb; }
          .label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; font-family: Arial, sans-serif; }
          .value { font-size: 12.5px; color: #111827; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; }
          th { background: #1e1b4b; color: #fff; padding: 8px 10px; font-size: 9.5px; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; font-family: Arial, sans-serif; }
          td { padding: 7px 10px; border: 1px solid #e5e7eb; font-size: 11px; }
          tr:nth-child(even) td { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: bold; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-yellow { background: #fef3c7; color: #92400e; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #C9A227; text-align: center; font-size: 9.5px; color: #9ca3af; font-family: Arial, sans-serif; }
          @media print { body { padding: 16px 22px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoData ? `<img class="logo" src="${logoData}" alt="College logo">` : `<div class="brand-name">${Str.escHtml(collegeInfo.name)}</div>`}
          <div class="doc-badge">
            <div class="doc-title">MENTOR'S FILE</div>
            <div class="doc-year">Academic Year ${DateFmt.currentYear()}–${DateFmt.currentYear() + 1}</div>
            <div><span class="stamp">Confidential</span></div>
          </div>
        </div>
        <div class="rule"></div>
        <div class="rule-thin"></div>

        <div class="summary">
          <div class="box"><div class="n">${ov.total}</div><div class="l">Semesters</div></div>
          <div class="box"><div class="n">${ov.passed}</div><div class="l">Passed</div></div>
          <div class="box"><div class="n">${ov.failed}</div><div class="l">Failed</div></div>
          <div class="box"><div class="n">${Str.escHtml(semRecords[semRecords.length-1]?.attendance ?? '—')}${semRecords[semRecords.length-1]?.attendance!=null?'%':''}</div><div class="l">Latest Attendance</div></div>
        </div>

        <h2>A. Personal Details</h2>
        <div class="grid2">
          ${[
            ['Name', student.name],
            ['Roll No.', profile.rollNo || '—'],
            ['Department', dept?.name || '—'],
            ['Course', course?.name || '—'],
            ['Class', profile.className || '—'],
            ['Blood Group', profile.bloodGroup || '—'],
            ['Religion', profile.religion || '—'],
            ['Community', profile.community || '—'],
            ['Residence', profile.residenceType === 'hosteler' ? `Hosteler (${profile.hostelName || ''})` : 'Day Scholar'],
            ['Life Goal', profile.lifeGoal || '—'],
            ['Hobbies', profile.hobbies || '—'],
            ['Mentor', mentor?.name || '—']
          ].map(([l, v]) => `<div class="field"><div class="label">${l}</div><div class="value">${Str.escHtml(v)}</div></div>`).join('')}
        </div>

        <h2>B. Family Details</h2>
        <div class="grid2">
          ${[
            ["Father's Name", profile.fatherName || '—'],
            ["Father's Occupation", profile.fatherOccupation || '—'],
            ["Father's Phone", profile.fatherPhone || '—'],
            ["Mother's Name", profile.motherName || '—'],
            ["Mother's Occupation", profile.motherOccupation || '—'],
            ["Permanent Address", profile.permanentAddress || '—'],
            ["Communication Address", profile.communicationAddress || '—']
          ].map(([l, v]) => `<div class="field"><div class="label">${l}</div><div class="value">${Str.escHtml(v)}</div></div>`).join('')}
        </div>

        <h2>C. Entry Qualifications</h2>
        <table>
          <tr><th>Exam</th><th>School/Board</th><th>Percentage</th><th>Grade</th></tr>
          <tr><td>SSLC</td><td>${Str.escHtml(profile.sslcSchool || '—')}</td><td>${Str.escHtml(profile.sslcPercentage || '—')}</td><td>${Str.escHtml(profile.sslcGrade || '—')}</td></tr>
          <tr><td>Plus Two (+2)</td><td>${Str.escHtml(profile.plusTwoSchool || '—')}</td><td>${Str.escHtml(profile.plusTwoPercentage || '—')}</td><td>${Str.escHtml(profile.plusTwoGrade || '—')}</td></tr>
        </table>

        <h2>D. Academic Performance & Attendance</h2>
        <table>
          <tr><th>Semester</th><th>Grade Point</th><th>Grade</th><th>Attendance %</th><th>Remarks</th></tr>
          ${Array.from({ length: semCount }, (_, i) => {
            const r = semRecords.find(r => r.semester === i + 1);
            return `<tr><td>Semester ${i + 1}</td><td>${Str.escHtml(r?.gradePoint || '—')}</td><td>${Str.escHtml(r?.grade || '—')}</td><td>${r?.attendance ? r.attendance + '%' : '—'}</td><td>${Str.escHtml(r?.remarks || '—')}</td></tr>`;
          }).join('')}
        </table>

        <h2>E. Mentor Meeting Log</h2>
        <table>
          <tr><th>Semester</th><th>Date</th><th>Notes</th><th>Student Confirmed</th></tr>
          ${meetings.map(m => `<tr><td>Sem ${m.semester}</td><td>${DateFmt.format(m.date)}</td><td>${Str.escHtml(m.notes || '—')}</td><td>${m.studentConfirmed ? '✓ Yes' : 'Pending'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No meetings recorded</td></tr>'}
        </table>

        <h2>F. PTA Meeting Log</h2>
        <table>
          <tr><th>Semester</th><th>Date</th><th>Notes</th><th>Parent Acknowledged</th></tr>
          ${ptaMeetings.map(m => `<tr><td>Sem ${m.semester}</td><td>${DateFmt.format(m.date)}</td><td>${Str.escHtml(m.notes || '—')}</td><td>${m.parentAcknowledged ? '✓ Yes' : 'Pending'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No PTA meetings recorded</td></tr>'}
        </table>

        <h2>G. Co-Curricular Achievements</h2>
        <table>
          <tr><th>Semester</th><th>Date</th><th>Achievement</th><th>Category</th></tr>
          ${achievements.map(a => `<tr><td>Sem ${a.semester}</td><td>${DateFmt.format(a.date)}</td><td>${Str.escHtml(a.title)}</td><td>${Str.escHtml(a.category)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No achievements recorded</td></tr>'}
        </table>

        <div class="footer">
          Generated by MentorFile — ${Str.escHtml(collegeInfo.name)} · ${new Date().toLocaleString('en-IN')} · This is a digitally generated document.
        </div>
      </body>
      </html>`;

    // Open in new window and print
    const win = window.open('', '_blank', 'width=900,height=800');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }
};

// ── Shared Student Report (used by HOD, Teacher, Student, Parent) ──
// viewerRole controls confidentiality: students & parents never see
// confidential comments; staff see them per meeting visibility.
const StudentReport = {
  canSeeConfidential: (viewerRole) => ['admin', 'principal', 'hod', 'mentor', 'teacher'].includes(viewerRole),

  // Overview stats: passed / failed semesters
  overview: (studentId) => {
    const recs = DB.SemesterRecords.getAll(studentId);
    let passed = 0, failed = 0;
    recs.forEach(r => {
      const gp = parseFloat(r.gradePoint);
      if (isNaN(gp)) return;
      if (gp >= 5 && (r.grade || '').toUpperCase() !== 'F') passed++; else failed++;
    });
    return { total: recs.length, passed, failed };
  },

  renderHTML: (studentId, viewerRole = 'mentor') => {
    const student = DB.Users.getById(studentId);
    if (!student) return '<p>Student not found.</p>';
    const profile = DB.Profiles.get(studentId) || {};
    const course = DB.Courses.getById(student.courseId);
    const semCount = course ? course.semesterCount : 6;
    const recs = DB.SemesterRecords.getAll(studentId);
    const meetings = DB.Meetings.getAll(studentId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const ov = StudentReport.overview(studentId);
    const showConf = StudentReport.canSeeConfidential(viewerRole);
    const parent = DB.ParentLinks ? DB.ParentLinks.getParentForStudent(studentId) : null;

    // Semester-wise + subject-wise
    const semRows = Array.from({ length: semCount }, (_, i) => {
      const r = recs.find(rc => rc.semester === i + 1) || {};
      const subjects = r.subjects || [];
      const subjTable = subjects.length ? `
        <div style="padding:var(--space-3) var(--space-4);background:var(--bg-surface-2)">
          <table class="data-table" style="font-size:11px">
            <thead><tr><th>Subject</th><th>Attendance %</th><th>Internal</th><th>External</th><th>Grade</th></tr></thead>
            <tbody>${subjects.map(su => `<tr><td>${Str.escHtml(su.name || '—')}</td><td>${su.attendance ?? '—'}</td><td>${su.internal ?? '—'}</td><td>${su.external ?? '—'}</td><td>${su.grade || '—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>` : '';
      return `<tr>
          <td>Sem ${i + 1}</td>
          <td>${Str.escHtml(r.gradePoint || '—')}</td>
          <td>${Str.escHtml(r.grade || '—')}</td>
          <td>${r.attendance ? Str.escHtml(r.attendance) + '%' : '—'}</td>
          <td style="white-space:normal;font-size:11px">${Str.escHtml(r.remarks || '—')}</td>
        </tr>${subjTable ? `<tr><td colspan="5" style="padding:0">${subjTable}</td></tr>` : ''}`;
    }).join('');

    // Meeting reports (2 views): 1) discussion/comments/goals, 2) date-wise
    const meetingRows = meetings.length ? meetings.map(m => `
      <tr>
        <td>Sem ${m.semester}</td>
        <td>${DateFmt.format(m.date)}</td>
        <td style="white-space:normal;font-size:11px">${Str.escHtml(m.notes || m.discussion || '—')}</td>
        <td style="white-space:normal;font-size:11px">${Str.escHtml(m.goals || '—')}</td>
        ${showConf ? `<td style="white-space:normal;font-size:11px;color:var(--danger)">${Str.escHtml(m.confidentialComments || '—')}</td>` : ''}
      </tr>`).join('') : `<tr><td colspan="${showConf ? 5 : 4}" style="text-align:center;color:var(--text-tertiary)">No meetings recorded.</td></tr>`;

    return `
      <div class="flex gap-4 mb-4" style="flex-wrap:wrap">
        <span class="badge badge-purple">${ov.total} semesters</span>
        <span class="badge badge-green">${ov.passed} passed</span>
        <span class="badge badge-red">${ov.failed} failed</span>
        ${renderStatusBadge(DB.Analytics.getStudentStatus(studentId))}
      </div>

      <h3 style="font-size:var(--font-size-sm);font-weight:700;margin:var(--space-4) 0 var(--space-2)">Semester Performance (Subject-wise)</h3>
      <div class="table-wrapper"><table class="data-table">
        <thead><tr><th>Sem</th><th>SGPA</th><th>Grade</th><th>Attendance</th><th>Remarks</th></tr></thead>
        <tbody>${semRows}</tbody>
      </table></div>

      <h3 style="font-size:var(--font-size-sm);font-weight:700;margin:var(--space-5) 0 var(--space-2)">Meeting Reports</h3>
      <div class="table-wrapper"><table class="data-table">
        <thead><tr><th>Sem</th><th>Date</th><th>Discussion</th><th>Goals</th>${showConf ? '<th>Confidential</th>' : ''}</tr></thead>
        <tbody>${meetingRows}</tbody>
      </table></div>

      ${['mentor','hod','principal','admin','teacher'].includes(viewerRole) ? `
      <h3 style="font-size:var(--font-size-sm);font-weight:700;margin:var(--space-5) 0 var(--space-2)">Parent Details</h3>
      <div class="text-sm" style="color:var(--text-secondary)">
        <div>Parent: <strong>${parent ? Str.escHtml(parent.name) : (profile.fatherName ? Str.escHtml(profile.fatherName) : '—')}</strong></div>
        <div>Email: ${Str.escHtml(student.parentEmail || (parent ? parent.email : '—'))}</div>
        <div>Access approved: ${student.parentApproved ? 'Yes' : 'No'}</div>
        <div>Phone: ${profile.fatherPhone ? Str.escHtml(profile.fatherPhone) : '—'}</div>
      </div>` : ''}`;
  },

  show: (studentId, viewerRole = 'mentor') => {
    const student = DB.Users.getById(studentId);
    Modal.create('student-report', {
      title: `Report — ${student ? student.name : 'Student'}`,
      size: 'lg',
      body: StudentReport.renderHTML(studentId, viewerRole),
      footer: `<button class="btn btn-secondary" onclick="Modal.close('student-report')">Close</button>
               <button class="btn btn-primary" onclick="PDFGen.generate('${studentId}')">${Icons.download} Export PDF</button>`,
    });
  },
};

// ── Page Guard ────────────────────────────────────────────────
function requireAuth(allowedRoles = []) {
  if (!DB.isSessionValid()) {
    window.location.href = `${getRootPath()}/index.html`;
    return null;
  }
  const session = DB.getSession();
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    window.location.href = `${getRootPath()}/index.html`;
    return null;
  }
  return session;
}

function getRootPath() {
  const parts = window.location.pathname.split('/');
  const pagesIdx = parts.indexOf('pages');
  if (pagesIdx !== -1) return parts.slice(0, pagesIdx).join('/');
  return parts.slice(0, -1).join('/');
}

function redirectToRoleDashboard(role) {
  const base = getRootPath();
  const map = { admin: 'pages/admin.html', principal: 'pages/hod.html', mentor: 'pages/mentor.html', hod: 'pages/hod.html', student: 'pages/student.html', parent: 'pages/parent.html' };
  window.location.href = `${base}/${map[role] || 'index.html'}`;
}

// ── Sidebar Builder ───────────────────────────────────────────
function buildSidebar(containerId, navItems, session) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const college = DB.Settings.getCollegeInfo();
  const unread = DB.Notifications.getUnread(session.userId);
  const profile = session.role === 'student' ? DB.Profiles.get(session.userId) : null;

  container.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${Icons.book}</div>
      <div class="sidebar-logo-text">
        <h1>${college.name}</h1>
        <p>MentorFile</p>
      </div>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav-items">
      ${navItems.map(section => `
        <div class="nav-section">
          ${section.label ? `<div class="nav-section-label">${section.label}</div>` : ''}
          ${section.items.map(item => `
            <button class="nav-item ${item.active ? 'active' : ''}" onclick="${item.onclick || ''}">
              ${item.icon}
              <span class="nav-item-text">${item.label}</span>
              ${item.badge ? `<span class="badge badge-red" style="margin-left:auto">${item.badge}</span>` : ''}
            </button>`).join('')}
        </div>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" onclick="showUserMenu()">
        ${renderAvatar(session.name, 'sm')}
        <div class="sidebar-user-info">
          <div class="name">${session.name}</div>
          <div class="role">${roleLabel(session.role)}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-full btn-sm" style="margin-top:var(--space-3)" onclick="logout()">
        ${Icons.logOut}<span style="margin-left:6px">Sign Out</span>
      </button>
    </div>`;
}

function showUserMenu() {
  const session = DB.getSession();
  Modal.create('user-menu', {
    title: 'Account',
    size: 'sm',
    body: `
      <div style="text-align:center;padding:var(--space-4) 0">
        ${renderAvatar(session.name, 'xl')}
        <div style="margin-top:var(--space-4);font-size:var(--font-size-lg);font-weight:700">${session.name}</div>
        <div style="color:var(--text-secondary);font-size:var(--font-size-sm)">${session.email}</div>
        <div style="margin-top:var(--space-2)">${renderRoleBadge(session.role)}</div>
      </div>
      <hr class="divider">
      <div style="display:flex;flex-direction:column;gap:var(--space-2)">
        <button class="btn btn-secondary btn-full" onclick="showChangePassword()">Change Password</button>
      </div>`,
  });
}

function showChangePassword() {
  Modal.close('user-menu');
  Modal.create('change-password', {
    title: 'Change Password',
    size: 'sm',
    body: `
      <div class="form-group">
        <label class="form-label required">Current Password</label>
        <div class="password-input-wrap">
          <input type="password" class="form-input" id="cp-current" placeholder="Enter current password">
          <button class="password-toggle" onclick="togglePwd('cp-current')">${Icons.eye}</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label required">New Password</label>
        <div class="password-input-wrap">
          <input type="password" class="form-input" id="cp-new" placeholder="Min. 8 characters">
          <button class="password-toggle" onclick="togglePwd('cp-new')">${Icons.eye}</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label required">Confirm New Password</label>
        <input type="password" class="form-input" id="cp-confirm" placeholder="Re-enter new password">
      </div>
      <div id="cp-error"></div>`,
    footer: `<button class="btn btn-secondary" onclick="Modal.close('change-password')">Cancel</button>
             <button class="btn btn-primary" onclick="doChangePassword()">Update Password</button>`,
  });
}

async function doChangePassword() {
  const session = DB.getSession();
  const current = document.getElementById('cp-current')?.value;
  const newPwd = document.getElementById('cp-new')?.value;
  const confirm = document.getElementById('cp-confirm')?.value;
  const errEl = document.getElementById('cp-error');

  if (!current || !newPwd || !confirm) { errEl.innerHTML = `<div class="auth-error">${Icons.alert} All fields are required.</div>`; return; }
  if (newPwd !== confirm) { errEl.innerHTML = `<div class="auth-error">${Icons.alert} Passwords do not match.</div>`; return; }
  if (newPwd.length < 8) { errEl.innerHTML = `<div class="auth-error">${Icons.alert} Password must be at least 8 characters.</div>`; return; }

  const user = DB.Users.getById(session.userId);
  const valid = await DB.verifyPassword(current, user.passwordHash);
  if (!valid) { errEl.innerHTML = `<div class="auth-error">${Icons.alert} Current password is incorrect.</div>`; return; }

  const hash = await DB.hashPassword(newPwd);
  DB.Users.update(session.userId, { passwordHash: hash }, session.userId);
  Modal.close('change-password');
  Toast.success('Password changed', 'Your password has been updated successfully.');
}

function logout() {
  DB.clearSession();
  window.location.href = `${getRootPath()}/index.html`;
}

function togglePwd(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Initialize theme on every page load
Theme.init();

// Add toast animation
const style = document.createElement('style');
style.textContent = `@keyframes toast-out { to { opacity: 0; transform: translateX(100%); } }`;
document.head.appendChild(style);
