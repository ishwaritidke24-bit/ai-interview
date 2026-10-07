const { checkCoverage } = require('../src/services/coverage/coverageChecker');
const { runQuestionGenerationPipeline } = require('../src/services/generation/questionPipeline');
const { generateQuestionsForKit } = require('../src/services/generation/questionGenerator');

jest.mock('../src/services/generation/questionGenerator', () => ({
  generateQuestionsForKit: jest.fn()
}));

describe('Coverage Module', () => {
  const reqs = [
    { id: 'r1', priority: 'must', text: 'React' },
    { id: 'r2', priority: 'must', text: 'Node' },
    { id: 'r3', priority: 'must', text: 'SQL' },
    { id: 'r4', priority: 'nice', text: 'Docker' }
  ];

  describe('coverageChecker', () => {
    it('returns empty uncovered arrays when all requirements are covered', () => {
      const q = [
        { requirement_ids: ['r1', 'r2'] },
        { requirement_ids: ['r3', 'r4'] }
      ];
      const res = checkCoverage(reqs, q);
      expect(res.uncovered_requirement_ids.length).toBe(0);
      expect(res.passes_all_must).toBe(true);
    });

    it('identifies uncovered must and nice requirements correctly', () => {
      const q = [{ requirement_ids: ['r1'] }];
      const res = checkCoverage(reqs, q);
      
      expect(res.uncovered_requirement_ids).toEqual(['r2', 'r3', 'r4']);
      expect(res.uncovered_must_requirement_ids).toEqual(['r2', 'r3']);
      expect(res.uncovered_nice_requirement_ids).toEqual(['r4']);
      expect(res.passes_all_must).toBe(false);
    });

    it('invalid requirement IDs do not fake coverage', () => {
      const q = [{ requirement_ids: ['r99'] }, { requirement_ids: ['r1'] }];
      const res = checkCoverage(reqs, q);
      
      expect(res.covered_requirement_ids).toEqual(['r1']); // r99 ignored
      expect(res.uncovered_requirement_ids).toContain('r2');
    });
  });

  describe('questionPipeline', () => {
    beforeEach(() => jest.clearAllMocks());

    it('no unnecessary second pass if pass 1 covers all musts', async () => {
      const kit = { role: { requirements: reqs }, questions: [] };
      generateQuestionsForKit.mockResolvedValueOnce([
        { requirement_ids: ['r1'] },
        { requirement_ids: ['r2'] },
        { requirement_ids: ['r3'] }
      ]);

      await runQuestionGenerationPipeline(kit);
      
      expect(generateQuestionsForKit).toHaveBeenCalledTimes(1); // Only pass 1
      expect(kit.coverage.passes).toBe(1);
      // r4 is nice, so no pass 2 triggered even though it is uncovered
      expect(kit.coverage.uncovered_requirement_ids).toEqual(['r4']);
    });

    it('second pass triggers and closes the gap for must requirements', async () => {
      const kit = { role: { requirements: reqs }, questions: [] };
      
      generateQuestionsForKit
        .mockResolvedValueOnce([ // Pass 1 leaves r3 uncovered
          { requirement_ids: ['r1'] },
          { requirement_ids: ['r2'] }
        ])
        .mockResolvedValueOnce([ // Pass 2 fixes r3
          { requirement_ids: ['r3'] }
        ]);

      await runQuestionGenerationPipeline(kit);
      
      expect(generateQuestionsForKit).toHaveBeenCalledTimes(2);
      expect(kit.coverage.passes).toBe(2);
      expect(kit.coverage.uncovered_requirement_ids).not.toContain('r3');
    });

    it('second pass failure maintains honest gap reporting', async () => {
      const kit = { role: { requirements: reqs }, questions: [] };
      
      generateQuestionsForKit
        .mockResolvedValueOnce([ // Pass 1 leaves r2, r3 uncovered
          { requirement_ids: ['r1'] }
        ])
        .mockResolvedValueOnce([]); // Pass 2 fails to return anything for them

      await runQuestionGenerationPipeline(kit);
      
      expect(generateQuestionsForKit).toHaveBeenCalledTimes(2);
      expect(kit.coverage.passes).toBe(2);
      expect(kit.coverage.uncovered_requirement_ids).toEqual(['r2', 'r3', 'r4']);
      expect(kit.internal_research.warnings[0]).toContain('Final coverage failed to cover');
    });
  });
});
