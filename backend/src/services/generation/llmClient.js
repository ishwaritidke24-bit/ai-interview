const { parseJson } = require('./parseJson');
const { sleep } = require('../retrieval/rateLimiter'); // Reuse sleep

const callGeminiAPI = async (systemInstruction, taskPrompt, apiKey, model) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${taskPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Low temperature for deterministic JSON output
      responseMimeType: 'application/json'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('LLM_RATE_LIMIT');
    throw new Error(`LLM_API_ERROR_${res.status}`);
  }

  const data = await res.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('LLM_EMPTY_RESPONSE');
  }

  return data.candidates[0].content.parts[0].text;
};

exports.generateStructured = async (systemInstruction, taskPrompt, requiredFields = [], options = {}) => {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
  const maxRetries = options.retries || 2;
  
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  let lastError;
  let delay = 2000;
  
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
      } else if (error.message === 'LLM_RATE_LIMIT' || error.message.includes('LLM_API_ERROR_5')) {
        // Rate limit or server error, backoff
      } else {
        // Fatal error (e.g. 400 Bad Request, 401 Auth)
        break; 
      }
      
      if (attempt < maxRetries) {
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  throw new Error(`LLM generation failed after ${maxRetries} retries. Last error: ${lastError.message}`);
};
