const { generateStructured } = require('./llmClient');
const { getFlashcardGenerationPrompt } = require('./prompts');

// REDUCED for performance: Keep kit reasonably small
const CARDS_PER_MUST = 1;
const CARDS_PER_NICE = 1;

const normalizeString = (str) => {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
};

exports.generateFlashcardsForKit = async (kit) => {
  const generatedFlashcards = [];
  const normalizedFronts = new Set();

  const existingFlashcards = Array.isArray(kit.flashcards) ? kit.flashcards : [];
  existingFlashcards.forEach(card => {
    if (card.front) normalizedFronts.add(normalizeString(card.front));
  });

  const roleContext = `Title: ${kit.role.title}, Seniority: ${kit.role.seniority}`;
  // REDUCE CONTEXT
  const companyContext = kit.company_brief?.what_they_do?.substring(0, 300) || 'Unknown';

  let nextFid = existingFlashcards.length + 1;
  const reqsToProcess = kit.role.requirements.slice(0, 7);

  for (const req of reqsToProcess) {
    const countNeeded = req.priority === 'must' ? CARDS_PER_MUST : CARDS_PER_NICE;
    const relatedQuestions = (kit.questions || [])
      .filter(q => q.requirement_ids && q.requirement_ids.includes(req.id))
      .map(q => q.prompt);

    const relatedQuestionsContext = relatedQuestions.length > 0
      ? relatedQuestions.slice(0, 1).join(' | ').substring(0, 150)
      : 'None';
    const { systemInstruction, taskPrompt } = getFlashcardGenerationPrompt(
      req.text, countNeeded, relatedQuestionsContext, roleContext, companyContext
    );

    try {
      const fcData = await generateStructured(systemInstruction, taskPrompt, ['cards']);
      if (!Array.isArray(fcData.cards)) throw new Error('LLM did not return a cards array');

      for (const card of fcData.cards) {
        if (!card.front || !card.back) continue;

        const normalized = normalizeString(card.front);
        if (normalizedFronts.has(normalized)) continue;

        generatedFlashcards.push({
          id: `f${nextFid++}`,
          front: card.front,
          back: card.back,
          requirement_ids: [req.id]
        });
        normalizedFronts.add(normalized);
      }
    } catch (error) {
      console.warn(`Failed to generate flashcards for req ${req.id}:`, error.message);
    }
  }

  return generatedFlashcards;
};
