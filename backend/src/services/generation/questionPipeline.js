const { checkCoverage } = require('../coverage/coverageChecker');
const { generateQuestionsForKit } = require('./questionGenerator');

const MAX_COVERAGE_PASSES = 2; // Pass 1: initial, Pass 2: gap closure

exports.runQuestionGenerationPipeline = async (kit) => {
  let passes = 0;
  let coverageResult = null;

  // PASS 1: Generate questions for all requirements
  const initialQuestions = await generateQuestionsForKit(kit);
  kit.questions.push(...initialQuestions);
  passes++;

  // Check coverage
  coverageResult = checkCoverage(kit.role.requirements, kit.questions);

  // PASS 2: If there are uncovered MUST requirements, run gap generation
  if (passes < MAX_COVERAGE_PASSES && coverageResult.uncovered_must_requirement_ids.length > 0) {
    console.log(`Coverage Pass ${passes + 1} starting. Closing gaps for:`, coverageResult.uncovered_must_requirement_ids);
    
    // Extract the specific requirement objects that are missing MUSTs
    const targetReqs = kit.role.requirements.filter(r => 
      coverageResult.uncovered_must_requirement_ids.includes(r.id)
    );

    // Run question generator specifically targeting these gaps
    const gapQuestions = await generateQuestionsForKit(kit, targetReqs);
    kit.questions.push(...gapQuestions);
    passes++;
    
    // Re-check coverage after Pass 2
    coverageResult = checkCoverage(kit.role.requirements, kit.questions);
  }

  // Final Coverage assignment
  kit.coverage = {
    uncovered_requirement_ids: coverageResult.uncovered_requirement_ids,
    passes: passes
  };

  if (!coverageResult.passes_all_must) {
    kit.internal_research = kit.internal_research || {};
    kit.internal_research.warnings = kit.internal_research.warnings || [];
    kit.internal_research.warnings.push(`Final coverage failed to cover all 'must' requirements. Uncovered MUSTs: ${coverageResult.uncovered_must_requirement_ids.join(', ')}`);
  }

  return kit;
};
