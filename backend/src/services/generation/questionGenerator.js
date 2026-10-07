const { generateStructured } = require('./llmClient');
const { getQuestionGenerationPrompt } = require('./prompts');

const QUESTIONS_PER_MUST = 2;
const QUESTIONS_PER_NICE = 1;

const normalizeString = (str) => {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
};

const determineCategories = (requirement, role, interviewResearch) => {
  const cats = [];
  const reqText = requirement.text.toLowerCase();

  if (requirement.kind === 'behavioural') {
    cats.push('behavioural');
    return cats;
  }

  if (requirement.kind === 'domain') {
    // If it mentions company context or the company specifically requested it, maybe company-fit, else technical.
    cats.push('technical');
    cats.push('company-fit');
    return cats;
  }

  // Technical
  cats.push('technical');

  const triggersSystemDesign = 
    reqText.includes('architecture') || reqText.includes('scale') || 
    reqText.includes('system') || reqText.includes('api') || 
    reqText.includes('backend') || reqText.includes('infrastructure');
  
  const hasSystemDesignRound = interviewResearch?.findings?.some(f => f.topic === 'system_design');

  if (triggersSystemDesign || hasSystemDesignRound) {
    cats.push('system-design');
  }

  return cats;
};

exports.generateQuestionsForKit = async (kit, targetRequirements = null) => {
  const generatedQuestions = [];
  const normalizedPrompts = new Set();
  const existingPrompts = kit.questions.map(q => normalizeString(q.prompt));
  existingPrompts.forEach(p => normalizedPrompts.add(p));

  const roleContext = `Title: ${kit.role.title}, Seniority: ${kit.role.seniority}`;
  const companyContext = kit.company_brief.what_they_do || 'Unknown';
  
  let interviewContextStr = 'No specific interview format known.';
  if (kit.internal_research && kit.internal_research.interview_process) {
    const findings = kit.internal_research.interview_process.findings || [];
    if (findings.length > 0) {
      interviewContextStr = findings.map(f => `${f.topic}: ${f.detail}`).join(' | ');
    }
  }

  let nextQid = kit.questions.length + 1;
  const requirementsToProcess = targetRequirements || kit.role.requirements;

  // Process sequentially to respect rate limits
  for (const req of requirementsToProcess) {
    const categories = determineCategories(req, kit.role, kit.internal_research?.interview_process);
    const countNeeded = req.priority === 'must' ? QUESTIONS_PER_MUST : QUESTIONS_PER_NICE;

    for (let i = 0; i < countNeeded; i++) {
      const targetCategory = categories[i % categories.length];

      const { systemInstruction, taskPrompt } = getQuestionGenerationPrompt(
        req.text,
        targetCategory,
        companyContext,
        interviewContextStr,
        roleContext
      );

      try {
        const qData = await generateStructured(systemInstruction, taskPrompt, ['prompt', 'answer_outline', 'difficulty']);

        // Validate structure
        const diff = parseInt(qData.difficulty);
        if (isNaN(diff) || diff < 1 || diff > 3) throw new Error('Invalid difficulty');
        if (!qData.prompt || !qData.answer_outline) throw new Error('Missing prompt or outline');

        const normalized = normalizeString(qData.prompt);
        if (normalizedPrompts.has(normalized)) continue; // Deduplicate

        generatedQuestions.push({
          id: `q${nextQid++}`,
          requirement_ids: [req.id],
          category: targetCategory,
          prompt: qData.prompt,
          answer_outline: qData.answer_outline,
          difficulty: diff
        });
        
        normalizedPrompts.add(normalized);
      } catch (error) {
        console.warn(`Failed to generate question for req ${req.id} in category ${targetCategory}:`, error.message);
      }
    }
  }

  return generatedQuestions;
};
