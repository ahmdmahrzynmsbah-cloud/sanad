const { initializeApp } = require('firebase/app');
const { getFirestore, doc } = require('firebase/firestore');

const app = initializeApp({ projectId: "test" });
const db = getFirestore(app);
const ref = doc(db, "my_collection", "my_doc");

console.log("Parent:", ref.parent);
console.log("Parent ID:", ref.parent ? ref.parent.id : "NO PARENT");
