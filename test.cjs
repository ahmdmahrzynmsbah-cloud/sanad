const fetch = require('node-fetch');
async function test() {
  const payload = {
    systemName: 'Test',
    founderPhotoUrl: 'data:image/jpeg;base64,' + 'A'.repeat(800000)
  };
  const res = await fetch('https://ais-dev-mpbabq5azhtonhl5ndq4eq-853596307183.europe-west2.run.app/api/admin/settings/branding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
