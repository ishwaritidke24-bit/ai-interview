const { generateStructured } = require('./llmClient');
const { getQuestionGenerationPrompt } = require('./prompts');

// REDUCED for performance: Keep initial kit reasonably small
const QUESTIONS_PER_MUST = 1; 
const QUESTIONS_PER_NICE = 1;

const normalizeString = (str) => {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
};

const determineCategories = (requirement, role, interviewResearch) => {
  const cats = [];
  const reqText = requirement.text.toLowerCase();

  if (requirement.kind === 'behavioural') return ['behavioural'];

  if (requirement.kind === 'domain') {
    return ['technical', 'company-fit'];
  }

  const triggersSystemDesign = 
    reqText.includes('architecture') || reqText.includes('scale') || 
    reqText.includes('system') || reqText.includes('api') || 
    reqText.includes('backend') || reqText.includes('infrastructure');
  
  const hasSystemDesignRound = interviewResearch?.findings?.some(f => f.topic === 'system_design');

  if (triggersSystemDesign || hasSystemDesignRound) {
    cats.push('system-design');
  }

  cats.push('technical');

  return cats;
};

exports.generateQuestionsForKit = async (kit, targetRequirements = null) => {
  const generatedQuestions = [];
  const normalizedPrompts = new Set();
  const existingQuestions = Array.isArray(kit.questions) ? kit.questions : [];
  const existingPrompts = existingQuestions.map(q => normalizeString(q.prompt));
  existingPrompts.forEach(p => normalizedPrompts.add(p));

  const roleContext = `Title: ${kit.role.title}, Seniority: ${kit.role.seniority}`;
  // REDUCE CONTEXT sent to LLM
  const companyContext = kit.company_brief?.what_they_do?.substring(0, 300) || 'Unknown';
  
  let interviewContextStr = 'No specific interview format known.';
  if (kit.internal_research && kit.internal_research.interview_process) {
    const findings = kit.internal_research.interview_process.findings || [];
    if (findings.length > 0) {
      interviewContextStr = findings.slice(0, 2).map(f => `${f.topic}: ${f.detail}`).join(' | ').substring(0, 300);
    }
  }

  let nextQid = existingQuestions.length + 1;
  // Cap at max 4 requirements to prevent excessive generation
  const reqs = targetRequirements || kit.role.requirements;
  const requirementsToProcess = reqs.slice(0, 4);

  // Serialize provider calls so one failed or rate-limited request does not
  // discard successful questions or amplify a provider quota error.
  for (const req of requirementsToProcess) {
    const categories = determineCategories(req, kit.role, kit.internal_research?.interview_process);
    const countNeeded = req.priority === 'must' ? QUESTIONS_PER_MUST : QUESTIONS_PER_NICE;

    for (let j = 0; j < countNeeded; j++) {
      const targetCategory = categories[j % categories.length];
      const { systemInstruction, taskPrompt } = getQuestionGenerationPrompt(
        req.text, targetCategory, companyContext, interviewContextStr, roleContext
      );

      try {
        const qData = await generateStructured(systemInstruction, taskPrompt, ['prompt', 'answer_outline', 'difficulty']);
        const diff = parseInt(qData.difficulty, 10);
        if (Number.isNaN(diff) || diff < 1 || diff > 3) throw new Error('Invalid difficulty');
        if (!qData.prompt || !qData.answer_outline) throw new Error('Missing prompt or outline');

        const normalized = normalizeString(qData.prompt);
        if (normalizedPrompts.has(normalized)) continue;

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
        console.warn(`Failed to generate question for req ${req.id}: ${error.message}`);
      }
    }
  }

  return generatedQuestions;
};
