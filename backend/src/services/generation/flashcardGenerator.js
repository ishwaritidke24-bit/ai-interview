const { generateStructured } = require('./llmClient');
const { getFlashcardGenerationPrompt } = require('./prompts');

const CARDS_PER_MUST = 2;
const CARDS_PER_NICE = 1;

const normalizeString = (str) => {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
};

exports.generateFlashcardsForKit = async (kit) => {
  const generatedFlashcards = [];
  const normalizedFronts = new Set();

  const roleContext = `Title: ${kit.role.title}, Seniority: ${kit.role.seniority}`;
  const companyContext = kit.company_brief.what_they_do || 'Unknown';

  let nextFid = 1;

  for (const req of kit.role.requirements) {
    const countNeeded = req.priority === 'must' ? CARDS_PER_MUST : CARDS_PER_NICE;

    // Gather questions related to this requirement to provide as context
    const relatedQuestions = kit.questions
      .filter(q => q.requirement_ids && q.requirement_ids.includes(req.id))
      .map(q => q.prompt);
    
    let relatedQuestionsContext = 'None';
    if (relatedQuestions.length > 0) {
      relatedQuestionsContext = relatedQuestions.slice(0, 3).join(' | '); // Provide up to 3 as hint
    }

    const { systemInstruction, taskPrompt } = getFlashcardGenerationPrompt(
      req.text,
      countNeeded,
      relatedQuestionsContext,
      roleContext,
      companyContext
    );

    try {
      const fcData = await generateStructured(systemInstruction, taskPrompt, ['cards']);

      if (!Array.isArray(fcData.cards)) {
        throw new Error('LLM did not return a cards array');
      }

      for (const card of fcData.cards) {
        if (!card.front || !card.back) continue;

        const normalized = normalizeString(card.front);
        if (normalizedFronts.has(normalized)) continue; // Deduplicate
        
        // Truncate overly long text safely if needed (or just allow it if reasonable, the prompt asks for concise)
        generatedFlashcards.push({
          id: `f${nextFid++}`,
          front: card.front,
          back: card.back,
          requirement_ids: [req.id] // Code strictly assigns the requirement ID!
        });

        normalizedFronts.add(normalized);
      }
    } catch (error) {
      console.warn(`Failed to generate flashcards for req ${req.id}:`, error.message);
    }
  }

  return generatedFlashcards;
};
