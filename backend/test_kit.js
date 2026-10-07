async function run() {
  try {
    const r1 = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testkit10@test.com', password: 'pass' })
    });
    const cookie = r1.headers.get('set-cookie');
    console.log('Registered, cookie:', cookie);

    const r2 = await fetch('http://localhost:3001/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cookie': cookie },
      body: JSON.stringify({ jd: 'Junior Full Stack Developer', company_url: 'https://www.github.com', days: 5 })
    });
    const data2 = await r2.json();
    console.log('Kit triggered:', data2);

    const kitId = data2.kit.id;
    let status = data2.kit.status;
    let attempts = 0;
    while (status === 'queued' || status === 'generating') {
      await new Promise(r => setTimeout(r, 5000));
      const r3 = await fetch('http://localhost:3001/api/kits/' + kitId, {
        headers: { 'cookie': cookie }
      });
      const data3 = await r3.json();
      status = data3.kit.status;
      console.log(`[Attempt ${++attempts}] Status:`, status, data3.kit.generationStatus);
    }
    console.log('Final status:', status);
  } catch (e) {
    console.error(e);
  }
}
run();
