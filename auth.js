// ── Auth System ────────────────────────────────────────────

function showLogin()  { document.getElementById('loginPane').classList.remove('hidden'); document.getElementById('signupPane').classList.add('hidden'); document.querySelectorAll('.auth-tab')[0].classList.add('active'); document.querySelectorAll('.auth-tab')[1].classList.remove('active'); }
function showSignup() { document.getElementById('signupPane').classList.remove('hidden'); document.getElementById('loginPane').classList.add('hidden'); document.querySelectorAll('.auth-tab')[1].classList.add('active'); document.querySelectorAll('.auth-tab')[0].classList.remove('active'); }

// Login
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) return showToast('هەموو بەشەکان پڕ بکە', 'warning');

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = '...';

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('بەخێربێیت! ئامادەی گواستنەوە...', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
  } catch (e) {
    let msg = 'چوونەژوورەوە سەرکەوتوو نەبوو';
    if (e.code === 'auth/user-not-found')     msg = 'بەکارهێنەر نەدۆزرایەوە';
    if (e.code === 'auth/wrong-password')     msg = 'تێپەڕەوشە هەڵەیە';
    if (e.code === 'auth/invalid-email')      msg = 'ئیمەیل هەڵەیە';
    if (e.code === 'auth/too-many-requests')  msg = 'زۆر هەوڵت دا، کەمێک چاوەڕێ بکە';
    showToast(msg, 'error');
  } finally { btn.disabled = false; btn.textContent = 'چوونەژوورەوە'; }
}

// Signup
async function signup() {
  const name  = document.getElementById('signupName').value.trim();
  const uname = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass  = document.getElementById('signupPassword').value;
  const pass2 = document.getElementById('signupConfirm').value;

  if (!name || !uname || !email || !pass || !pass2) return showToast('هەموو بەشەکان پڕ بکە', 'warning');
  if (!utils.validateEmail(email))    return showToast('ئیمەیل هەڵەیە', 'error');
  if (!utils.validateUsername(uname)) return showToast('ناوی بەکارهێنەر دەبێت 3-20 پیت بێت (a-z, 0-9, _)', 'error');
  if (!utils.validatePassword(pass))  return showToast('تێپەڕەوشە دەبێت لاکەم 6 پیت بێت', 'error');
  if (pass !== pass2)                 return showToast('تێپەڕەوشەکان یەکسان نین', 'error');

  const btn = document.getElementById('signupBtn');
  btn.disabled = true; btn.textContent = '...';

  try {
    const existing = await db.collection('users').where('username', '==', uname).get();
    if (!existing.empty) { showToast('ئەم ناوی بەکارهێنەرە پێشتر هەیە', 'error'); return; }

    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid  = cred.user.uid;

    await db.collection('users').doc(uid).set({
      uid, email, firstName: name, username: uname,
      profilePhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
      bio: '', role: 'user', status: 'ئامادە', isOnline: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('بە سەرکەوتوویی تۆمارکریت!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
  } catch (e) {
    let msg = 'تۆمارکردن سەرکەوتوو نەبوو';
    if (e.code === 'auth/email-already-in-use') msg = 'ئەم ئیمەیلە پێشتر بەکارهاتووە';
    if (e.code === 'auth/weak-password')        msg = 'تێپەڕەوشە لاوازە';
    showToast(msg, 'error');
  } finally { btn.disabled = false; btn.textContent = 'تۆمارکردن'; }
}

// Google
async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const u = result.user;
    const doc = await db.collection('users').doc(u.uid).get();
    if (!doc.exists) {
      await db.collection('users').doc(u.uid).set({
        uid: u.uid, email: u.email,
        firstName: u.displayName || 'بەکارهێنەر',
        username: u.email.split('@')[0] + '_' + Date.now().toString(36),
        profilePhoto: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
        bio: '', role: 'user', status: 'ئامادە', isOnline: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    showToast('بەخێربێیت!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
  } catch { showToast('چوونەژوورەوە سەرکەوتوو نەبوو', 'error'); }
}

// Logout
async function logout() {
  try {
    const u = auth.currentUser;
    if (u) await db.collection('users').doc(u.uid).update({ isOnline: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    await auth.signOut();
    window.location.href = 'index.html';
  } catch { showToast('دەرچوون سەرکەوتوو نەبوو', 'error'); }
}

// Password reset
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('ئیمەیلی گۆڕینی تێپەڕەوشە نێردرا', 'success');
  } catch { showToast('نەتوانرا ئیمەیل بنێردرێت', 'error'); }
}

// Update profile
async function updateProfile(updates) {
  try {
    const u = auth.currentUser;
    await db.collection('users').doc(u.uid).update({ ...updates, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('پڕۆفایل نوێکرایەوە', 'success');
  } catch { showToast('نەتوانرا پڕۆفایل نوێبکرێتەوە', 'error'); }
}

// Change password
async function changePassword(current, next) {
  try {
    const u = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(u.email, current);
    await u.reauthenticateWithCredential(cred);
    await u.updatePassword(next);
    showToast('تێپەڕەوشە گۆڕدرا', 'success');
  } catch (e) {
    const msg = e.code === 'auth/wrong-password' ? 'تێپەڕەوشەی کۆن هەڵەیە' : 'نەتوانرا تێپەڕەوشە بگۆڕدرێت';
    showToast(msg, 'error');
    throw e;
  }
}

// Auth state
auth.onAuthStateChanged(async u => {
  if (!u) return;
  try {
    await db.collection('users').doc(u.uid).update({
      isOnline: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch {}
});

window.authFns = { login, signup, signInWithGoogle, logout, resetPassword, updateProfile, changePassword, showLogin, showSignup };
