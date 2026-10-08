const { parseJson } = require('./parseJson');
const { sleep } = require('../retrieval/rateLimiter'); // Reuse sleep

const callGeminiAPI = async (systemInstruction, taskPrompt, apiKey, model) => {
  const isBearer = apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.');
  const url = isBearer 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${taskPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2 // Low temperature for deterministic JSON output
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Strict 15s timeout

  const headers = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['x-goog-api-key'] = apiKey;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'No response body');
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        throw new Error(`LLM_RATE_LIMIT:${retryAfter || 2}`);
      }
      throw new Error(`LLM_API_ERROR_${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('LLM_EMPTY_RESPONSE');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('LLM_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

exports.generateStructured = async (systemInstruction, taskPrompt, requiredFields = [], options = {}) => {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
  // Reduce retries to 1 to avoid hanging UI
  const maxRetries = options.retries || 10;
  
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  let lastError;
  let delay = 1000;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const rawOutput = await callGeminiAPI(systemInstruction, taskPrompt, apiKey, model);
      return parseJson(rawOutput, requiredFields);
    } catch (error) {
      lastError = error;
      console.warn(`LLM attempt ${attempt + 1} failed: ${error.message}`);
      
      if (error.message.includes('LLM_JSON')) {
        // Validation error, append a correction request for the next prompt attempt
        taskPrompt += '\n\nIMPORTANT: Your previous output was invalid JSON or missing required fields. Ensure strictly compliant JSON format.';
      } else if (error.message.startsWith('LLM_RATE_LIMIT')) {
        console.log(`[RATE LIMIT] Sleeping for 65 seconds...`);
        delay = 65000;
      } else if (error.message === 'LLM_TIMEOUT' || error.message.includes('LLM_API_ERROR_5')) {
        delay *= 2;
      } else {
        // Fatal error (e.g. 400 Bad Request, 401 Auth)
        break; 
      }
      
      if (attempt < maxRetries) {
        await sleep(delay); // Wait the full required time
      }
    }
  }

  throw new Error(`LLM generation failed after ${maxRetries} retries. Last error: ${lastError.message}`);
};

exports.verifyLLMConfig = async () => {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
  
  if (!apiKey) {
    console.error('[FATAL] Missing LLM_API_KEY in environment');
    process.exit(1);
  }

  const isBearer = apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.');
  const url = isBearer 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: 'Respond with exactly one word: "OK"' }] }],
    generationConfig: { temperature: 0.2 }
  };

  const headers = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['x-goog-api-key'] = apiKey;
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'No response body');
      console.error(`\n[FATAL] LLM CONFIGURATION TEST FAILED`);
      console.error(`Endpoint: ${url.split('?')[0]}`);
      console.error(`Model: ${model}`);
      console.error(`Status: ${res.status}`);
      console.error(`Error: ${errText}\n`);
      console.error(`Your API key and model combination is incompatible with the standard Gemini REST API.`);
      process.exit(1);
    }
    
    const data = await res.json();
    if (!data.candidates || data.candidates.length === 0) {
      console.error('[FATAL] LLM returned empty response.');
      process.exit(1);
    }
    console.log(`[INFO] LLM configuration verified. Model: ${model}`);
  } catch (err) {
    console.error(`[FATAL] LLM connection failed: ${err.message}`);
    process.exit(1);
  }
};
