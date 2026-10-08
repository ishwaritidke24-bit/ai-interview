require('dotenv').config();
const apiKey = process.env.LLM_API_KEY;
if (!apiKey) { console.error('Missing LLM_API_KEY'); process.exit(1); }
const pageToken = process.argv[2] || '';
const url = pageToken
  ? `https://generativelanguage.googleapis.com/v1beta/models?pageToken=${pageToken}&key=${apiKey}`
  : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
fetch(url)
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => { console.error('Fetch error', err); process.exit(1); });
