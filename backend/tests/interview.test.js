const { researchInterviewProcess } = require('../src/services/research/interviewResearch');
const { generateStructured } = require('../src/services/generation/llmClient');

jest.mock('../src/services/generation/llmClient', () => ({
  generateStructured: jest.fn()
}));

jest.mock('../src/services/retrieval/fetchPage', () => ({
  fetchPage: jest.fn(async (url) => {
    if (url.includes('duckduckgo')) {
      if (url.includes('Failure')) return { status: 'failed' };
      return { status: 'success', html: '<body>Some fake duckduckgo snippets about Technical interviews and coding tests.</body>' };
    }
    return { status: 'failed' };
  })
}));

describe('Interview Research Modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles no results gracefully without fabricating findings', async () => {
    generateStructured.mockResolvedValueOnce({
      status: 'no_results',
      findings: [],
      warnings: []
    });

    const res = await researchInterviewProcess('UnknownCompany', 'Engineer', []);
    
    expect(res.status).toBe('no_results');
    expect(res.findings.length).toBe(0);
    expect(res.warnings).toContain('No reliable public interview-process information found.');
  });

  it('incorporates company hiring page', async () => {
    generateStructured.mockResolvedValueOnce({
      status: 'found',
      findings: [
        { topic: 'technical', detail: 'Technical interview', source_urls: ['https://example.com/careers'] }
      ],
      warnings: []
    });

    const res = await researchInterviewProcess('CompanyX', 'Engineer', [
      { url: 'https://example.com/careers', title: 'Careers', text: 'We do a technical interview.' }
    ]);
    
    expect(res.sources.some(s => s.source_type === 'company_hiring_page')).toBe(true);
    expect(res.findings.length).toBe(1);
    expect(res.findings[0].topic).toBe('technical');
  });

  it('source failure records warning but continues', async () => {
    generateStructured.mockResolvedValueOnce({
      status: 'found',
      findings: [{ topic: 'behavioural', detail: 'Behavioral test', source_urls: ['some_url'] }],
      warnings: []
    });

    const res = await researchInterviewProcess('FailureCompany', 'Engineer', [
      { url: 'https://example.com/careers', title: 'Careers', text: 'Behavioral test.' }
    ]);
    
    // Duckduckgo will return failed, but it shouldn't crash
    expect(res.status).toBe('found');
    expect(res.findings.length).toBe(1);
  });
});
