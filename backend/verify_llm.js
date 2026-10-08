
require('dotenv').config();

async function testGeminiAPI() {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';

  console.log('CURRENT ENDPOINT:');
  const isBearer = apiKey && (apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.'));
  const url = isBearer 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log(url);

  console.log('\nCONFIRMED MODEL:');
  console.log(model);

  if (!apiKey) {
    console.log('\nKEY/API TEST:\nFAIL\n\nEXACT ERROR IF FAILED:\nMissing LLM_API_KEY in .env');
    process.exit(1);
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Respond with exactly one word: "OK"' }]
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  };

  const headers = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['x-goog-api-key'] = apiKey;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'No response body');
      console.log(`\nKEY/API TEST:\nFAIL\n\nEXACT ERROR IF FAILED:\nStatus: ${res.status}\nBody: ${errText}`);
      process.exit(1);
    }

    const data = await res.json();
    if (!data.candidates || data.candidates.length === 0) {
      console.log('\nKEY/API TEST:\nFAIL\n\nEXACT ERROR IF FAILED:\nEmpty response from LLM');
      process.exit(1);
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log(`\nKEY/API TEST:\nPASS\nResponse: ${text.trim()}`);
  } catch (error) {
    console.log(`\nKEY/API TEST:\nFAIL\n\nEXACT ERROR IF FAILED:\n${error.message}`);
    process.exit(1);
  }
}

testGeminiAPI();
