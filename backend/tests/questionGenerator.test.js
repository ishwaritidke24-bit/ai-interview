const { generateQuestionsForKit } = require('../src/services/generation/questionGenerator');
const { generateStructured } = require('../src/services/generation/llmClient');

jest.mock('../src/services/generation/llmClient', () => ({
  generateStructured: jest.fn()
}));

describe('Question Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockKit = {
    role: {
      title: 'Engineer',
      seniority: 'Mid',
      requirements: [
        { id: 'r1', text: 'React experience', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Leadership', kind: 'behavioural', priority: 'nice' }
      ]
    },
    company_brief: { what_they_do: 'Tech company' },
    internal_research: { interview_process: { findings: [] } },
    questions: []
  };

  it('valid question is added, duplicate rejected, invalid rejected', async () => {
    generateStructured
      .mockResolvedValueOnce({ prompt: 'How does React work?', answer_outline: 'Diffing', difficulty: 2 })
      .mockResolvedValueOnce({ prompt: 'how does react work?', answer_outline: 'Diffing', difficulty: 2 }) // Duplicate
      .mockResolvedValueOnce({ prompt: 'Tell me about a time you led', answer_outline: 'STAR', difficulty: 4 }); // Invalid difficulty

    const questions = await generateQuestionsForKit(mockKit);

    // r1 is 'must', asks for 2 questions. 1st is valid, 2nd is dupe. r2 is 'nice', 1st is invalid difficulty.
    expect(questions.length).toBe(1);
    expect(questions[0].prompt).toBe('How does React work?');
    expect(questions[0].requirement_ids).toEqual(['r1']);
    expect(questions[0].category).toBe('technical');
    expect(questions[0].difficulty).toBe(2);
    expect(questions[0].id).toBe('q1');
  });

  it('research influence triggers system-design', async () => {
    const kitWithResearch = JSON.parse(JSON.stringify(mockKit));
    kitWithResearch.internal_research.interview_process.findings.push({ topic: 'system_design' });

    generateStructured
      .mockResolvedValueOnce({ prompt: 'Design Twitter', answer_outline: 'Queue', difficulty: 3 })
      .mockResolvedValueOnce({ prompt: 'Design Facebook', answer_outline: 'DB', difficulty: 2 })
      .mockResolvedValueOnce({ prompt: 'Tell me a story', answer_outline: 'STAR', difficulty: 1 });

    const questions = await generateQuestionsForKit(kitWithResearch);

    // r1 is technical/must, asks 2 questions. Categories should rotate between technical and system-design.
    expect(questions.length).toBe(3); // 2 for r1, 1 for r2
    expect(questions.some(q => q.category === 'system-design')).toBe(true);
  });

  it('partial failure allows successful questions to persist', async () => {
    generateStructured
      .mockRejectedValueOnce(new Error('LLM failed')) // Fails first question of r1
      .mockResolvedValueOnce({ prompt: 'Valid Q1', answer_outline: 'Ans1', difficulty: 1 }) // Succeeds second question of r1
      .mockResolvedValueOnce({ prompt: 'Valid Q2', answer_outline: 'Ans2', difficulty: 2 }); // Succeeds r2

    const questions = await generateQuestionsForKit(mockKit);

    expect(questions.length).toBe(2); // Retains the 2 that succeeded
    expect(questions[0].prompt).toBe('Valid Q1');
  });
});
