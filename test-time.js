const { initializeApp } = require('@firebase/app');
const { getFirestore, collection, getDocs } = require('@firebase/firestore');

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function test() {
  console.time('fetch');
  try {
    await getDocs(collection(db, 'users'));
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.timeEnd('fetch');
}
test();
