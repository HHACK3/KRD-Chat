// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUmPUgvcNQiT1OMelbVCwgzIdmrtqbV9w",
  authDomain: "krd-chat.firebaseapp.com",
  projectId: "krd-chat",
  storageBucket: "krd-chat.firebasestorage.app",
  messagingSenderId: "462153418531",
  appId: "1:462153418531:web:e3760d5244cbc4bb9c6e96",
  measurementId: "G-D15BHYN94C"
};

firebase.initializeApp(firebaseConfig);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') console.warn('Persistence: multiple tabs');
  else if (err.code === 'unimplemented') console.warn('Persistence: not supported');
});

const googleProvider = new firebase.auth.GoogleAuthProvider();

window.auth = auth;
window.db   = db;
window.storage = storage;
window.googleProvider = googleProvider;
