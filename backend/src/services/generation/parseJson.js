exports.parseJson = (rawOutput, requiredFields = []) => {
  let text = rawOutput.trim();

  // Strip markdown formatting if the LLM wrapped it in ```json ... ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    text = jsonMatch[1].trim();
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error('LLM_JSON_PARSE_ERROR');
  }

  // Validate required fields
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      throw new Error(`LLM_JSON_MISSING_FIELD_${field}`);
    }
  }

  return data;
};
