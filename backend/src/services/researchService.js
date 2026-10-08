const { crawlCompany } = require('./retrieval');
const { generateStructured } = require('./generation/llmClient');
const { getCompanyBriefPrompt, getRoleExtractionPrompt } = require('./generation/prompts');
const Kit = require('../models/Kit');

exports.runInitialResearch = async (kitId, userId, jdText) => {
  const startTime = Date.now();
  const timeLog = [];
  const logTime = (stage, start) => {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    timeLog.push(`[Kit] ${stage}: ${duration}s`);
    console.log(`[GEN] Stage completed: ${stage} (${duration}s)`);
  };

  let kit;
  try {
    console.log(`[GEN] Starting generation for kit: ${kitId}`);
    kit = await Kit.findOne({ _id: kitId, userId });
    if (!kit) throw new Error('Kit not found');

    kit.status = 'generating';
    kit.generationStatus = 'researching_company';
    await kit.save();
    console.log(`[GEN] Stage: researching_company`);

    // PARALLELIZE 1: Company Crawl + JD Extraction
    const tCrawlAndJd = Date.now();
    const crawlResult = await crawlCompany(kit.source.company_url)
      .then(val => ({ status: 'fulfilled', value: val }))
      .catch(err => ({ status: 'rejected', reason: err }));
      
    let roleResult;
    try {
      const { systemInstruction: roleSys, taskPrompt: roleTask } = getRoleExtractionPrompt(jdText);
      const val = await generateStructured(roleSys, roleTask, ['title', 'responsibilities', 'requirements']);
      roleResult = { status: 'fulfilled', value: val };
    } catch (err) {
      roleResult = { status: 'rejected', reason: err };
    }

    if (roleResult.status === 'rejected') {
      throw new Error(`Role extraction failed: ${roleResult.reason.message}`);
    }
    const research = crawlResult.status === 'fulfilled' ? crawlResult.value : { pages: [], sources: [], failed_sources: [], research_warnings: [] };
    const roleData = roleResult.value;

    kit.role = {
      title: roleData.title,
      seniority: roleData.seniority || '',
      responsibilities: roleData.responsibilities || [],
      requirements: roleData.requirements || []
    };
    logTime('researching_company', tCrawlAndJd);

    kit.generationStatus = 'extracting_requirements';
    await kit.save();
    console.log(`[GEN] Stage: extracting_requirements`);

    // 2. Generate Company Brief
    const tBrief = Date.now();
    let companyBriefData;
    if (research.pages.length > 0) {
      const reducedPages = research.pages.slice(0, 2);
      const { systemInstruction: briefSys, taskPrompt: briefTask } = getCompanyBriefPrompt(reducedPages);
      try {
        companyBriefData = await generateStructured(briefSys, briefTask, ['summary', 'what_they_do', 'sources']);
      } catch (e) {
        throw new Error(`Company brief generation failed: ${e.message}`);
      }
    } else {
      companyBriefData = { summary: 'No accessible company information found.', what_they_do: '', sources: [] };
    }
    logTime('extracting_requirements', tBrief);

    kit.company_brief = {
      summary: companyBriefData.summary || '',
      what_they_do: companyBriefData.what_they_do || '',
      sources: companyBriefData.sources || []
    };
    if (companyBriefData.company_name) {
      kit.source.company = companyBriefData.company_name;
    }

    kit.generationStatus = 'researching_interviews';
    await kit.save();
    console.log(`[GEN] Stage: researching_interviews`);

    // 3. Public Interview Research
    const tInterview = Date.now();
    const { researchInterviewProcess } = require('./research/interviewResearch');
    const hiringPages = research.pages.filter(p => p.category === 'hiring').slice(0, 1);
    const interviewResearchData = await researchInterviewProcess(kit.source.company, kit.role.title, hiringPages);
    
    kit.internal_research = {
      company_pages: research.pages.slice(0, 3), // Cap size
      interview_process: interviewResearchData,
      failed_sources: research.failed_sources,
      warnings: (research.research_warnings || []).concat(interviewResearchData.warnings || [])
    };
    logTime('researching_interviews', tInterview);

    // 4. Generate Question Bank & Guarantee Coverage
    kit.generationStatus = 'generating_questions';
    await kit.save();
    console.log(`[GEN] Stage: generating_questions`);
    
    const tQuestions = Date.now();
    const { runQuestionGenerationPipeline } = require('./generation/questionPipeline');
    await runQuestionGenerationPipeline(kit, async (stage) => {
      console.log(`[GEN] Stage: ${stage}`);
      kit.generationStatus = stage;
      await kit.save().catch(e => console.error('[GEN][ERROR] Error saving sub-stage', e));
    });
    logTime('generating_questions', tQuestions);

    // 5. Schedule Allocation
    kit.generationStatus = 'building_schedule';
    await kit.save();
    console.log(`[GEN] Stage: building_schedule`);
    
    const tSchedule = Date.now();
    const { allocateSchedule } = require('./scheduling/scheduleAllocator');
    const daysAvailable = kit.schedule?.days_available || 5; 
    
    kit.schedule = allocateSchedule({
      requirements: kit.role.requirements,
      questions: kit.questions,
      daysAvailable: daysAvailable
    });
    logTime('building_schedule', tSchedule);

    // 6. Generate Flashcards
    kit.generationStatus = 'generating_flashcards';
    await kit.save();
    console.log(`[GEN] Stage: generating_flashcards`);
    
    const tFlashcards = Date.now();
    const { generateFlashcardsForKit } = require('./generation/flashcardGenerator');
    const flashcards = await generateFlashcardsForKit(kit);
    kit.flashcards.push(...flashcards);
    logTime('generating_flashcards', tFlashcards);

    kit.generationStatus = 'finalizing';
    await kit.save();
    console.log(`[GEN] Stage: finalizing`);

    const { validateKit } = require('./validation/kitValidator');
    validateKit(kit);

    kit.status = 'completed'; // Mark completed
    kit.generationStatus = 'completed';
    await kit.save();
    console.log(`[GEN] Stage: completed`);
    
    logTime('completed', startTime);
    return kit;
  } catch (error) {
    console.error(`[GEN][FAILED]
kitId: ${kitId}
stage: ${kit ? kit.generationStatus : 'unknown'}
error name: ${error.name}
error message: ${error.message}
stack: ${error.stack}`);
    try {
      const Kit = require('../models/Kit');
      const k = await Kit.findOne({ _id: kitId, userId });
      if (k) {
        const currentStage = k.generationStatus;
        k.status = 'failed';
        k.generationStatus = 'failed';
        k.generationStage = currentStage !== 'failed' ? currentStage : 'unknown';
        k.generationError = {
          code: error.name || 'UNKNOWN',
          message: error.message || 'Generation failed.'
        };
        k.internal_research = k.internal_research || {};
        k.internal_research.error = error.message;
        k.markModified('internal_research');
        await k.save();
        console.log(`[GEN] Stage: failed`);
      }
    } catch (e) {
      console.error('[GEN][ERROR] Could not persist failure state:', e);
    }
  }
};
