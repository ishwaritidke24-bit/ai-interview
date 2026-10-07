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

  const roleContext = `Title: ${kit.role.title}, Seniority: ${kit.role.seniority}`;
  // REDUCE CONTEXT
  const companyContext = kit.company_brief?.what_they_do?.substring(0, 300) || 'Unknown';

  let nextFid = 1;
  const reqsToProcess = kit.role.requirements.slice(0, 7);

  for (let i = 0; i < reqsToProcess.length; i += 2) {
    const batch = reqsToProcess.slice(i, i + 2);
    
    const promises = batch.map(async (req) => {
      const countNeeded = req.priority === 'must' ? CARDS_PER_MUST : CARDS_PER_NICE;

      const relatedQuestions = kit.questions
        .filter(q => q.requirement_ids && q.requirement_ids.includes(req.id))
        .map(q => q.prompt);
      
      let relatedQuestionsContext = 'None';
      if (relatedQuestions.length > 0) {
        relatedQuestionsContext = relatedQuestions.slice(0, 1).join(' | ').substring(0, 150); 
      }

      const { systemInstruction, taskPrompt } = getFlashcardGenerationPrompt(
        req.text, countNeeded, relatedQuestionsContext, roleContext, companyContext
      );

      try {
        const fcData = await generateStructured(systemInstruction, taskPrompt, ['cards']);
        if (!Array.isArray(fcData.cards)) throw new Error('LLM did not return a cards array');
        
        const validCards = [];
        for (const card of fcData.cards) {
          if (!card.front || !card.back) continue;

          const normalized = normalizeString(card.front);
          if (normalizedFronts.has(normalized)) continue;
          
          validCards.push({
            id: `f${nextFid++}`, // Using nextFid asynchronously can be tricky, but push happens sequentially
            front: card.front,
            back: card.back,
            reqId: req.id
          });
          normalizedFronts.add(normalized);
        }
        return validCards;
      } catch (error) {
        console.warn(`Failed to generate flashcards for req ${req.id}:`, error.message);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const cardsForReq of results) {
      for (const c of cardsForReq) {
        generatedFlashcards.push({
          id: `f${nextFid++}`,
          front: c.front,
          back: c.back,
          requirement_ids: [c.reqId]
        });
      }
    }
  }

  return generatedFlashcards;
};
