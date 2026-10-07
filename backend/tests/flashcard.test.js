const { generateFlashcardsForKit } = require('../src/services/generation/flashcardGenerator');
const { generateStructured } = require('../src/services/generation/llmClient');

jest.mock('../src/services/generation/llmClient', () => ({
  generateStructured: jest.fn()
}));

describe('Flashcard Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockKit = {
    role: {
      title: 'Engineer',
      seniority: 'Mid',
      requirements: [
        { id: 'r1', priority: 'must', text: 'React' },
        { id: 'r2', priority: 'nice', text: 'Docker' }
      ]
    },
    company_brief: { what_they_do: 'Tech company' },
    questions: [
      { prompt: 'What is JSX?', requirement_ids: ['r1'] }
    ],
    flashcards: []
  };

  it('valid flashcard is appended, deduplicates properly, IDs are stable', async () => {
    generateStructured
      .mockResolvedValueOnce({
        cards: [
          { front: 'What is React?', back: 'Library' },
          { front: 'what is react?', back: 'Duplicate' } // Deduplicate
        ]
      })
      .mockResolvedValueOnce({
        cards: [
          { front: 'What is Docker?', back: 'Container' }
        ]
      });

    const cards = await generateFlashcardsForKit(mockKit);

    expect(cards.length).toBe(2);
    expect(cards[0].id).toBe('f1');
    expect(cards[0].front).toBe('What is React?');
    expect(cards[0].requirement_ids).toEqual(['r1']);

    expect(cards[1].id).toBe('f2');
    expect(cards[1].front).toBe('What is Docker?');
    expect(cards[1].requirement_ids).toEqual(['r2']);
  });

  it('invalid cards missing front/back are rejected safely', async () => {
    generateStructured
      .mockResolvedValueOnce({
        cards: [
          { front: '', back: 'Library' }, // Invalid
          { front: 'Valid', back: 'ValidBack' }
        ]
      })
      .mockResolvedValueOnce({ cards: [] });

    const cards = await generateFlashcardsForKit(mockKit);
    expect(cards.length).toBe(1);
    expect(cards[0].front).toBe('Valid');
  });

  it('partial failure maintains honest generation', async () => {
    generateStructured
      .mockRejectedValueOnce(new Error('LLM failed')) // r1 fails
      .mockResolvedValueOnce({ cards: [{ front: 'Docker?', back: 'Yes' }] }); // r2 succeeds

    const cards = await generateFlashcardsForKit(mockKit);

    expect(cards.length).toBe(1);
    expect(cards[0].requirement_ids).toEqual(['r2']);
  });
});
