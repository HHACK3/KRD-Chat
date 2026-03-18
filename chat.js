// ── Chat System ─────────────────────────────────────────────

let currentUser = null;
let currentChat = null; // { id, type: 'private'|'group', name, avatar, otherUid? }
let unsubMessages = null;
let unsubFriends  = null;
let unsubGroups   = null;
let unsubNotifs   = null;
let activeTab     = 'friends';

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await utils.requireAuth();
  currentUser = await utils.getCurrentUser();
  loadUserProfile();
  showTab('friends');
  loadFriends();
  loadNotifBadge();
});

// ── Load Current User ───────────────────────────────────────
async function loadUserProfile() {
  const data = await utils.getUserData(currentUser.uid);
  if (!data) return;
  document.getElementById('sidebarUserName').textContent   = data.firstName || 'بەکارهێنەر';
  document.getElementById('sidebarUserStatus').textContent = data.status || 'ئامادە';
  const av = document.getElementById('sidebarUserAvatar');
  if (av && data.profilePhoto) av.src = data.profilePhoto;
}

// ── Tabs ────────────────────────────────────────────────────
function showTab(tab) {
  activeTab = tab;
  ['friends','groups','notifs','blocked'].forEach(t => {
    document.getElementById('tab_' + t)?.classList.remove('active');
    document.getElementById('panel_' + t)?.classList.add('hidden');
  });
  document.getElementById('tab_' + tab)?.classList.add('active');
  document.getElementById('panel_' + tab)?.classList.remove('hidden');

  if (tab === 'friends')  loadFriends();
  if (tab === 'groups')   loadGroups();
  if (tab === 'notifs')   loadNotifications();
  if (tab === 'blocked')  loadBlocked();
}

// ── Friends ─────────────────────────────────────────────────
function loadFriends() {
  const list = document.getElementById('friendsList');
  if (!list) return;

  if (unsubFriends) unsubFriends();
  unsubFriends = db.collection('friends')
    .where('users', 'array-contains', currentUser.uid)
    .onSnapshot(async snap => {
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = `<div class="empty-state"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><p>هێشتا هاوڕێت نییە. گەڕانی بەکارهێنەران بکە!</p></div>`; return; }

      for (const doc of snap.docs) {
        const d = doc.data();
        const friendUid = d.users.find(u => u !== currentUser.uid);
        const friend = await utils.getUserData(friendUid);
        if (!friend) continue;
        list.appendChild(buildCLItem(friend, 'private'));
      }
    });
}

// ── Groups ──────────────────────────────────────────────────
function loadGroups() {
  const list = document.getElementById('groupsList');
  if (!list) return;

  if (unsubGroups) unsubGroups();
  unsubGroups = db.collection('publicGroups')
    .where('members', 'array-contains', currentUser.uid)
    .onSnapshot(snap => {
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = `<div class="empty-state"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><p>تۆ ئەندامی هیچ گروپێک نیت. گروپ دروست بکە!</p></div>`; return; }

      snap.forEach(doc => {
        const g = { uid: doc.id, ...doc.data(), firstName: doc.data().name, profilePhoto: doc.data().avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${doc.id}` };
        list.appendChild(buildCLItem(g, 'group'));
      });
    });
}

// ── Build chat list item ─────────────────────────────────────
function buildCLItem(data, type) {
  const el = document.createElement('div');
  el.className = 'cl-item';
  el.dataset.uid  = data.uid;
  el.dataset.type = type;
  const isOnline = data.isOnline;
  el.innerHTML = `
    <div class="cl-avatar-wrap">
      <img class="cl-avatar" src="${data.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`}" alt="">
      ${isOnline ? '<div class="cl-online"></div>' : ''}
    </div>
    <div class="cl-info">
      <div class="cl-name">${data.firstName || 'بەکارهێنەر'}</div>
      <div class="cl-preview">${type === 'group' ? (data.membersCount || '') + ' ئەندام' : (isOnline ? '🟢 ئامادە' : 'دەرچووە')}</div>
    </div>`;
  el.onclick = () => openChat(data, type);
  return el;
}

// ── Open Chat ───────────────────────────────────────────────
async function openChat(data, type) {
  // highlight item
  document.querySelectorAll('.cl-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`[data-uid="${data.uid}"][data-type="${type}"]`)?.classList.add('active');

  // Hide welcome, show input
  document.getElementById('chatWelcome')?.classList.add('hidden');
  document.getElementById('chatInputBar').classList.remove('hidden');

  // Update header
  document.getElementById('chatHeaderName').textContent   = data.firstName || 'گروپ';
  document.getElementById('chatHeaderStatus').textContent = data.isOnline ? 'ئامادە' : 'دەرچووە';
  document.getElementById('chatHeaderStatus').className   = 'chat-header-status' + (data.isOnline ? ' online' : '');
  document.getElementById('chatHeaderAvatar').src = data.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`;

  // Determine chat ID
  let chatId;
  if (type === 'private') {
    chatId = [currentUser.uid, data.uid].sort().join('_');
    currentChat = { id: chatId, type: 'private', name: data.firstName, avatar: data.profilePhoto, otherUid: data.uid };
    // Ensure chat doc exists
    const chatRef = db.collection('privateChats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) await chatRef.set({ participants: [currentUser.uid, data.uid], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  } else {
    chatId = data.uid;
    currentChat = { id: chatId, type: 'group', name: data.firstName, avatar: data.profilePhoto };
  }

  loadMessages(chatId, type);

  // Mobile: close sidebar
  closeMobileMenu();
}

// ── Messages ─────────────────────────────────────────────────
function loadMessages(chatId, type) {
  const area = document.getElementById('messagesArea');
  area.innerHTML = '';
  if (unsubMessages) unsubMessages();

  const col = type === 'private' ? 'privateMessages' : 'groupMessages';
  unsubMessages = db.collection(col)
    .where('chatId', '==', chatId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = { id: change.doc.id, ...change.doc.data() };
          renderMessage(msg, type);
        }
      });
      scrollToBottom();
    });
}

function renderMessage(msg, type) {
  const area = document.getElementById('messagesArea');
  const isMine = msg.senderUid === currentUser.uid;
  const el = document.createElement('div');
  el.className = 'msg ' + (isMine ? 'mine' : 'theirs');
  el.id = 'msg_' + msg.id;
  const ts = msg.createdAt ? utils.formatDate(msg.createdAt, 'time') : '';
  const av = msg.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderUid}`;
  el.innerHTML = `
    ${!isMine ? `<img class="msg-av" src="${av}" alt="">` : ''}
    <div>
      ${(!isMine && type === 'group') ? `<div class="msg-sender">${msg.senderName || ''}</div>` : ''}
      <div class="msg-bubble">${escapeHtml(msg.text || '')}</div>
      <div class="msg-time">${ts}</div>
    </div>
    ${isMine ? `<img class="msg-av" src="${av}" alt="">` : ''}`;
  area.appendChild(el);
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

function scrollToBottom() {
  const area = document.getElementById('messagesArea');
  if (area) area.scrollTop = area.scrollHeight;
}

// ── Send Message ─────────────────────────────────────────────
async function sendMessage() {
  if (!currentChat) return;
  const input = document.getElementById('msgInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  const userData = await utils.getUserData(currentUser.uid);
  const col = currentChat.type === 'private' ? 'privateMessages' : 'groupMessages';

  await db.collection(col).add({
    chatId:      currentChat.id,
    text,
    senderUid:   currentUser.uid,
    senderName:  userData?.firstName || 'بەکارهێنەر',
    senderPhoto: userData?.profilePhoto || '',
    createdAt:   firebase.firestore.FieldValue.serverTimestamp()
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('msgInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
});

// ── Notifications ────────────────────────────────────────────
function loadNotifBadge() {
  db.collection('friendRequests')
    .where('toUid', '==', currentUser?.uid)
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      const badge = document.getElementById('notifBadge');
      if (badge) { badge.textContent = snap.size; badge.style.display = snap.size > 0 ? 'flex' : 'none'; }
    });
}

function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  if (unsubNotifs) unsubNotifs();
  unsubNotifs = db.collection('friendRequests')
    .where('toUid', '==', currentUser.uid)
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = '<div class="empty-state"><p>هیچ داواکاریەکت نییە</p></div>'; return; }
      snap.forEach(doc => {
        const r = { id: doc.id, ...doc.data() };
        const el = document.createElement('div');
        el.className = 'notif-item';
        el.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <img src="${r.fromPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.fromUid}`}" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--b1);">
            <div>
              <div style="font-size:0.82rem;font-weight:700;color:var(--t1);">${r.fromName || 'بەکارهێنەر'}</div>
              <div style="font-size:0.72rem;color:var(--t3);">داواکاری هاوڕێیەتی</div>
            </div>
          </div>
          <div style="display:flex;gap:7px;">
            <button class="accept-btn" onclick="acceptFriend('${r.id}','${r.fromUid}')">قبوڵکردن</button>
            <button class="reject-btn" onclick="rejectFriend('${r.id}')">ڕەتکردنەوە</button>
          </div>`;
        list.appendChild(el);
      });
    });
}

async function acceptFriend(reqId, fromUid) {
  try {
    await db.collection('friends').add({ users: [currentUser.uid, fromUid], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('friendRequests').doc(reqId).update({ status: 'accepted' });
    showToast('هاوڕێ زیادکرا!', 'success');
  } catch { showToast('هەڵە ڕوویدا', 'error'); }
}

async function rejectFriend(reqId) {
  await db.collection('friendRequests').doc(reqId).update({ status: 'rejected' });
  showToast('ڕەتکرایەوە', 'success');
}

// ── Blocked ──────────────────────────────────────────────────
async function loadBlocked() {
  const list = document.getElementById('blockedList');
  if (!list) return;
  try {
    const snap = await db.collection('blocked').where('byUid', '==', currentUser.uid).get();
    list.innerHTML = '';
    if (snap.empty) { list.innerHTML = '<div class="empty-state"><p>هیچ کەسێک بلۆک نەکراوە</p></div>'; return; }
    for (const doc of snap.docs) {
      const d = doc.data();
      const u = await utils.getUserData(d.targetUid);
      if (!u) continue;
      const el = document.createElement('div');
      el.className = 'cl-item';
      el.innerHTML = `
        <img class="cl-avatar" src="${u.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}">
        <div class="cl-info"><div class="cl-name">${u.firstName}</div><div class="cl-preview" style="color:var(--t-red);">بلۆک کراوە</div></div>
        <button class="btn-icon" onclick="unblockUser('${doc.id}','${d.targetUid}')" title="بلۆک لابردن">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
        </button>`;
      list.appendChild(el);
    }
  } catch { list.innerHTML = '<div class="empty-state"><p>هەڵەیەک ڕوویدا</p></div>'; }
}

async function unblockUser(docId, targetUid) {
  await db.collection('blocked').doc(docId).delete();
  showToast('بلۆک لابرا', 'success');
  loadBlocked();
}

// ── User Search ──────────────────────────────────────────────
let searchType = 'users';
function setSearchType(t) { searchType = t; document.getElementById('userSearchInput').placeholder = t === 'users' ? 'ناوی بەکارهێنەر...' : 'ناوی گروپ...'; }

function searchUsers() { document.getElementById('searchModal').classList.remove('hidden'); document.getElementById('userSearchInput').focus(); }
function closeSearch() { document.getElementById('searchModal').classList.add('hidden'); document.getElementById('searchResults').innerHTML = ''; document.getElementById('userSearchInput').value = ''; }

async function performSearch() {
  const q = document.getElementById('userSearchInput').value.trim();
  if (!q) return;
  const res = document.getElementById('searchResults');
  res.innerHTML = '<div style="text-align:center;padding:20px;"><div class="spinner" style="margin:auto;"></div></div>';

  if (searchType === 'users') {
    const users = await utils.searchUsers(q);
    res.innerHTML = '';
    if (!users.length) { res.innerHTML = '<p style="text-align:center;color:var(--t3);font-size:0.82rem;padding:16px;">هیچ بەکارهێنەرێک نەدۆزرایەوە</p>'; return; }
    users.filter(u => u.uid !== currentUser.uid).forEach(u => {
      const el = document.createElement('div');
      el.className = 'cl-item';
      el.style.cursor = 'default';
      el.innerHTML = `
        <img class="cl-avatar" src="${u.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}">
        <div class="cl-info"><div class="cl-name">${u.firstName}</div><div class="cl-preview">@${u.username}</div></div>
        <button class="accept-btn" onclick="sendFriendReq('${u.uid}','${u.firstName}','${u.profilePhoto || ''}')">+هاوڕێ</button>`;
      res.appendChild(el);
    });
  } else {
    const snap = await db.collection('publicGroups').get();
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => (g.name || '').toLowerCase().includes(q.toLowerCase()));
    res.innerHTML = '';
    if (!groups.length) { res.innerHTML = '<p style="text-align:center;color:var(--t3);font-size:0.82rem;padding:16px;">هیچ گروپێک نەدۆزرایەوە</p>'; return; }
    groups.forEach(g => {
      const el = document.createElement('div');
      el.className = 'cl-item';
      el.style.cursor = 'default';
      el.innerHTML = `
        <img class="cl-avatar" src="${g.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${g.id}`}">
        <div class="cl-info"><div class="cl-name">${g.name}</div><div class="cl-preview">${g.membersCount || 0} ئەندام</div></div>
        <button class="accept-btn" onclick="joinGroup('${g.id}')">بەشداربوون</button>`;
      res.appendChild(el);
    });
  }
}

async function sendFriendReq(toUid, toName, toPhoto) {
  try {
    const exists = await db.collection('friendRequests').where('fromUid', '==', currentUser.uid).where('toUid', '==', toUid).where('status', '==', 'pending').get();
    if (!exists.empty) { showToast('داواکاری پێشتر نێردراوە', 'warning'); return; }
    const me = await utils.getUserData(currentUser.uid);
    await db.collection('friendRequests').add({
      fromUid: currentUser.uid, fromName: me?.firstName || '', fromPhoto: me?.profilePhoto || '',
      toUid, toName, status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('داواکاری هاوڕێیەتی نێردرا!', 'success');
  } catch { showToast('هەڵە ڕوویدا', 'error'); }
}

async function joinGroup(groupId) {
  try {
    await db.collection('publicGroups').doc(groupId).update({ members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
    showToast('بەشداربووتە گروپەکە!', 'success');
    closeSearch();
    showTab('groups');
  } catch { showToast('هەڵە ڕوویدا', 'error'); }
}

// ── Create Group ─────────────────────────────────────────────
function openCreateGroup() { document.getElementById('createGroupModal').classList.remove('hidden'); }
function closeCreateGroup() { document.getElementById('createGroupModal').classList.add('hidden'); document.getElementById('newGroupName').value = ''; document.getElementById('newGroupDesc').value = ''; }

async function createGroup() {
  const name = document.getElementById('newGroupName').value.trim();
  const desc = document.getElementById('newGroupDesc').value.trim();
  if (!name) return showToast('ناوی گروپ بنووسە', 'warning');
  try {
    const me = await utils.getUserData(currentUser.uid);
    await db.collection('publicGroups').add({
      name, description: desc,
      creatorUid: currentUser.uid,
      admins: [currentUser.uid],
      members: [currentUser.uid],
      membersCount: 1,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('گروپ دروست کرا!', 'success');
    closeCreateGroup();
    showTab('groups');
  } catch { showToast('هەڵە ڕوویدا', 'error'); }
}

// ── Mobile menu ──────────────────────────────────────────────
function openMobileMenu()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('show'); }
function closeMobileMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }

// ── Logout ───────────────────────────────────────────────────
async function logout() {
  try {
    if (currentUser) await db.collection('users').doc(currentUser.uid).update({ isOnline: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    await auth.signOut();
    window.location.href = 'index.html';
  } catch { showToast('هەڵە لە دەرچوون', 'error'); }
}

function goToProfile() { window.location.href = 'profile.html'; }
