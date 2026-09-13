const fs = require('fs');
let code = fs.readFileSync('server/firestore.ts', 'utf8');

const targetSetDoc = `async function setDoc(docRef: DocumentReference<any, any>, data: any, options?: any) {
  const result = options ? await firebaseSetDoc(docRef, data, options) : await firebaseSetDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}

async function updateDoc(docRef: DocumentReference<any, any>, data: any) {
  const result = await firebaseUpdateDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}`;

const replacementSetDoc = `async function setDoc(docRef: DocumentReference<any, any>, data: any, options?: any) {
  const cleanData = cleanUndefined(data);
  const result = options ? await firebaseSetDoc(docRef, cleanData, options) : await firebaseSetDoc(docRef, cleanData);
  notifyChange(docRef.parent.id);
  return result;
}

async function updateDoc(docRef: DocumentReference<any, any>, data: any) {
  const cleanData = cleanUndefined(data);
  const result = await firebaseUpdateDoc(docRef, cleanData);
  notifyChange(docRef.parent.id);
  return result;
}`;

code = code.replace(targetSetDoc, replacementSetDoc);
fs.writeFileSync('server/firestore.ts', code);
console.log("Updated setDoc/updateDoc to use cleanUndefined");
