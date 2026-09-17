const fs = require('fs');
let code = fs.readFileSync('server/firestore.ts', 'utf8');

const newFunc = `
export async function fetchVideosFromFirestore(): Promise<any[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'videos');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: any[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data());
    });
    return items;
  } catch (err) {
    handleFirestoreError('fetchVideosFromFirestore', err);
    return null;
  }
}
`;

if (!code.includes('fetchVideosFromFirestore')) {
  code += newFunc;
  fs.writeFileSync('server/firestore.ts', code, 'utf8');
  console.log('Added fetchVideosFromFirestore to server/firestore.ts');
}

let serverCode = fs.readFileSync('server.ts', 'utf8');
if (!serverCode.includes('fetchVideosFromFirestore')) {
  serverCode = serverCode.replace(
    "import {",
    "import {\n  fetchVideosFromFirestore,"
  );
  serverCode = serverCode.replace(
    "fetchSubscriptionPlansFromFirestore().catch(() => null),",
    "fetchSubscriptionPlansFromFirestore().catch(() => null),\n        fetchVideosFromFirestore().catch(() => null),"
  );
  serverCode = serverCode.replace(
    "const [cloudAbout, cloudContact, cloudCategories, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudPlans, cloudLaws, cloudLawRequests] = await Promise.all([",
    "const [cloudAbout, cloudContact, cloudCategories, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudPlans, cloudVideos, cloudLaws, cloudLawRequests] = await Promise.all(["
  );
  serverCode = serverCode.replace(
    "if (cloudLaws && cloudLaws.length > 0) {",
    "if (cloudVideos && cloudVideos.length > 0) {\n        db.videos = cloudVideos;\n        changed = true;\n      }\n      if (cloudLaws && cloudLaws.length > 0) {"
  );
  fs.writeFileSync('server.ts', serverCode, 'utf8');
  console.log('Patched server.ts to sync videos');
}
