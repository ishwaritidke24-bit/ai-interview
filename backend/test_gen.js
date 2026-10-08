const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true, baseURL: 'http://localhost:3001' }));

async function runTest() {
  try {
    // 1. Register a test user
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering ${email}...`);
    await client.post('/api/auth/register', { email, password, name: 'Test User' });
    await client.post('/api/auth/login', { email, password });

    // 2. Start generation
    console.log('Starting kit generation...');
    const res = await client.post('/api/kits', {
      jd: "Junior Full Stack Developer",
      company_url: "https://www.github.com",
      days: 5
    });
    
    const kitId = res.data.kit.id;
    console.log(`Kit ID: ${kitId}`);

    // 3. Poll status
    while (true) {
      const statusRes = await client.get(`/api/kits/${kitId}/status`);
      const { status, stage, progress, message, error } = statusRes.data;
      console.log(`[STATUS] ${status} | Stage: ${stage} | Progress: ${progress}% | Message: ${message}`);
      
      if (status === 'completed') {
        console.log('Generation completed successfully!');
        break;
      } else if (status === 'failed') {
        console.error('Generation failed!', error);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error('Script error:', err.response?.data || err.message);
  }
}

runTest();
