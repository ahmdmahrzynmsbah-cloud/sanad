async function test() {
  const payload = {
    systemName: 'Test',
    founderPhotoUrl: 'data:image/jpeg;base64,' + 'A'.repeat(400000)
  };
  console.log("Sending...");
  const res = await fetch('http://127.0.0.1:3000/api/admin/settings/branding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
