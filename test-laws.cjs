const admin = require('firebase-admin');
const serviceAccount = require('./firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkLaws() {
  const lawsSnap = await db.collection('laws').get();
  console.log('Laws count:', lawsSnap.size);
  const reqsSnap = await db.collection('law_requests').get();
  console.log('Requests count:', reqsSnap.size);
  const usersSnap = await db.collection('users').get();
  console.log('Users count:', usersSnap.size);
}

checkLaws().catch(console.error);
