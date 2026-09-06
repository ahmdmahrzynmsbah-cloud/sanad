Object.defineProperty(globalThis, 'fetch', {
  get: () => () => console.log('orig'),
  configurable: true
});
try {
  globalThis.fetch = () => console.log('new');
} catch (e) {
  console.log('assignment failed:', e.message);
}
Object.defineProperty(globalThis, 'fetch', {
  value: () => console.log('new 2'),
  configurable: true,
  writable: true
});
globalThis.fetch();
