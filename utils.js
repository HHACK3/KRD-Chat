// ── Utility Functions ──────────────────────────────────────

// Toast
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMessage');
  if (!t || !m) return;
  m.textContent = msg;
  t.className = '';
  if (type === 'success') t.className = 't-success';
  if (type === 'error')   t.className = 't-error';
  if (type === 'warning') t.className = 't-warning';
  t.style.display = 'flex';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

// Date
function formatDate(ts, fmt = 'short') {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (fmt === 'relative') {
    if (sec < 60)  return 'ئێستا';
    if (min < 60)  return `${min} خولەک`;
    if (hr < 24)   return `${hr} کاتژمێر`;
    if (day < 7)   return `${day} ڕۆژ`;
    return d.toLocaleDateString('ku');
  }
  if (fmt === 'time') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ku', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Debounce
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Validations
function validateEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validateUsername(u) { return /^[a-zA-Z0-9_]{3,20}$/.test(u); }
function validatePassword(p) { return p.length >= 6; }
function sanitize(s)         { return s.trim().replace(/[<>]/g, ''); }
function generateId()        { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// Auth helpers
function getCurrentUser() {
  return new Promise((res, rej) => {
    const unsub = auth.onAuthStateChanged(u => { unsub(); u ? res(u) : rej(new Error('لاگین نەکراوە')); });
  });
}

async function getUserData(uid) {
  try {
    const d = await db.collection('users').doc(uid).get();
    return d.exists ? { uid, ...d.data() } : null;
  } catch { return null; }
}

async function isAdmin() {
  try {
    const u = await getCurrentUser();
    const d = await db.collection('users').doc(u.uid).get();
    return d.data()?.role === 'admin';
  } catch { return false; }
}

async function requireAuth() {
  try { await getCurrentUser(); }
  catch { window.location.href = 'index.html'; }
}

async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) { showToast('ڕێگەت پێدراو نییە', 'error'); window.location.href = 'dashboard.html'; }
}

// Search users
async function searchUsers(q) {
  if (!q || q.length < 2) return [];
  try {
    const snap = await db.collection('users').limit(50).get();
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ql = q.toLowerCase();
    return all.filter(u =>
      (u.firstName || '').toLowerCase().includes(ql) ||
      (u.username  || '').toLowerCase().includes(ql)
    );
  } catch { return []; }
}

// Update status
async function updateUserStatus(status) {
  try {
    const u = await getCurrentUser();
    await db.collection('users').doc(u.uid).update({
      status,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch {}
}

// Format file size
function formatFileSize(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
}

// Copy
async function copyToClipboard(txt) {
  try { await navigator.clipboard.writeText(txt); showToast('کۆپی کرا', 'success'); }
  catch { showToast('کۆپی نەبوو', 'error'); }
}

// Online presence
function startPresence() {
  auth.onAuthStateChanged(async u => {
    if (!u) return;
    const ref = db.collection('users').doc(u.uid);
    await ref.update({ isOnline: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });

    window.addEventListener('beforeunload', () => {
      ref.update({ isOnline: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    });

    document.addEventListener('visibilitychange', () => {
      ref.update({
        isOnline: !document.hidden,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', startPresence);

window.utils = {
  showToast, formatDate, debounce, generateId,
  validateEmail, validateUsername, validatePassword, sanitize,
  getCurrentUser, getUserData, isAdmin, requireAuth, requireAdmin,
  searchUsers, updateUserStatus, formatFileSize, copyToClipboard, startPresence
};

// Global showToast shortcut
window.showToast = showToast;
