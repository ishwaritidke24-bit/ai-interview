const { parseJson } = require('../src/services/generation/parseJson');

describe('LLM Generation Modules', () => {
  describe('parseJson', () => {
    it('successfully extracts and parses markdown-wrapped JSON', () => {
      const raw = `
Here is your JSON:
\`\`\`json
{
  "title": "Software Engineer",
  "requirements": []
}
\`\`\`
      `;
      const parsed = parseJson(raw, ['title', 'requirements']);
      expect(parsed.title).toBe('Software Engineer');
      expect(Array.isArray(parsed.requirements)).toBe(true);
    });

    it('throws error for invalid JSON', () => {
      const raw = '{ "title": "Software Engineer" '; // Missing brace
      expect(() => parseJson(raw)).toThrow('LLM_JSON_PARSE_ERROR');
    });

    it('throws error when required fields are missing', () => {
      const raw = '{ "title": "Software Engineer" }';
      expect(() => parseJson(raw, ['title', 'requirements'])).toThrow('LLM_JSON_MISSING_FIELD_requirements');
    });
  });

  describe('Prompt Safety & Classification Rules', () => {
    const { getRoleExtractionPrompt, getCompanyBriefPrompt } = require('../src/services/generation/prompts');

    it('delimits untrusted JD content cleanly', () => {
      const { taskPrompt } = getRoleExtractionPrompt('UNTRUSTED_INJECTION');
      expect(taskPrompt).toContain('--- UNTRUSTED DATA START ---');
      expect(taskPrompt).toContain('UNTRUSTED_INJECTION');
      expect(taskPrompt).toContain('--- UNTRUSTED DATA END ---');
    });

    it('enforces priority rules in instructions', () => {
      const { systemInstruction } = getRoleExtractionPrompt('');
      expect(systemInstruction).toMatch(/"must" \(for required\/must-have\/minimum\)/i);
      expect(systemInstruction).toMatch(/"nice" \(for preferred\/bonus\/plus\)/i);
    });

    it('enforces kind rules in instructions', () => {
      const { systemInstruction } = getRoleExtractionPrompt('');
      expect(systemInstruction).toMatch(/"technical", "behavioural", or "domain"/i);
    });

    it('delimits untrusted Company Research cleanly', () => {
      const pages = [{ url: 'http://example.com', text: 'MALICIOUS' }];
      const { taskPrompt } = getCompanyBriefPrompt(pages);
      expect(taskPrompt).toContain('--- UNTRUSTED DATA START ---');
      expect(taskPrompt).toContain('MALICIOUS');
      expect(taskPrompt).toContain('--- UNTRUSTED DATA END ---');
    });
  });
});
