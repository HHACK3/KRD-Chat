// ═══════════════════════════════════════
// FIRESTORE RULES — firestore.rules
// ═══════════════════════════════════════
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function auth() { return request.auth != null; }
    function isAdmin() {
      return auth() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isOwner(uid) { return auth() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if auth();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      allow delete: if isOwner(uid) || isAdmin();
    }
    match /friends/{id} {
      allow read: if auth() && resource.data.users.hasAny([request.auth.uid]);
      allow create, update, delete: if auth() && request.resource.data.users.hasAny([request.auth.uid]);
    }
    match /friendRequests/{id} {
      allow read: if auth() && (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);
      allow create: if auth() && request.resource.data.fromUid == request.auth.uid;
      allow update, delete: if auth() && (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid || isAdmin());
    }
    match /privateChats/{id} {
      allow read, write: if auth() && resource.data.participants.hasAny([request.auth.uid]);
      allow create: if auth() && request.resource.data.participants.hasAny([request.auth.uid]);
    }
    match /privateMessages/{id} {
      allow read: if auth();
      allow create: if auth() && request.resource.data.senderUid == request.auth.uid;
      allow update, delete: if auth() && (resource.data.senderUid == request.auth.uid || isAdmin());
    }
    match /publicGroups/{id} {
      allow read: if auth();
      allow create: if auth();
      allow update: if auth() && (resource.data.admins.hasAny([request.auth.uid]) || isAdmin());
      allow delete: if auth() && (resource.data.creatorUid == request.auth.uid || isAdmin());
    }
    match /groupMessages/{id} {
      allow read: if auth();
      allow create: if auth() && request.resource.data.senderUid == request.auth.uid;
      allow update, delete: if auth() && (resource.data.senderUid == request.auth.uid || isAdmin());
    }
    match /blocked/{id} {
      allow read: if auth() && resource.data.byUid == request.auth.uid;
      allow create: if auth() && request.resource.data.byUid == request.auth.uid;
      allow delete: if auth() && resource.data.byUid == request.auth.uid;
    }
  }
}
*/

// ═══════════════════════════════════════
// STORAGE RULES — storage.rules
// ═══════════════════════════════════════
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuth() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }

    match /profilePhotos/{uid}/{file} {
      allow read: if isAuth();
      allow write: if isAuth() && isOwner(uid);
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
*/
