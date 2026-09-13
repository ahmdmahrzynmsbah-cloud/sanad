const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const app = initializeApp({ projectId: "test" });
const db = getFirestore(app);
const ref = doc(db, "my_collection", "my_doc");

try {
  setDoc(ref, { customSections: [{ id: "1", content: "hi", iconType: undefined }] }, { merge: true });
} catch (e) {
  console.log("Error:", e.message);
}
