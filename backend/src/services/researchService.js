const { crawlCompany } = require('./retrieval');
const { generateStructured } = require('./generation/llmClient');
const { getCompanyBriefPrompt, getRoleExtractionPrompt } = require('./generation/prompts');
const Kit = require('../models/Kit');

exports.runInitialResearch = async (kitId, userId, jdText) => {
  try {
    const kit = await Kit.findOne({ _id: kitId, userId });
    if (!kit) throw new Error('Kit not found');

    kit.status = 'generating';
    kit.generationStatus = 'Retrieving company information...';
    await kit.save();

    // 1. Crawl Company
    const research = await crawlCompany(kit.source.company_url);
    
    kit.generationStatus = 'Generating company brief...';
    await kit.save();

    // 2. Generate Company Brief
    let companyBriefData;
    if (research.pages.length > 0) {
      const { systemInstruction: briefSys, taskPrompt: briefTask } = getCompanyBriefPrompt(research.pages);
      try {
        companyBriefData = await generateStructured(briefSys, briefTask, ['summary', 'what_they_do', 'sources']);
      } catch (e) {
        console.error('Failed to generate company brief:', e);
        companyBriefData = { summary: 'Information could not be extracted automatically.', what_they_do: '', sources: research.sources };
      }
    } else {
      companyBriefData = { summary: 'No accessible company information found.', what_they_do: '', sources: [] };
    }

    kit.company_brief = {
      summary: companyBriefData.summary || '',
      what_they_do: companyBriefData.what_they_do || '',
      sources: companyBriefData.sources || []
    };
    if (companyBriefData.company_name) {
      kit.source.company = companyBriefData.company_name;
    }

    kit.generationStatus = 'Extracting job requirements...';
    await kit.save();

    // 3. Extract Role Requirements
    const { systemInstruction: roleSys, taskPrompt: roleTask } = getRoleExtractionPrompt(jdText);
    try {
      const roleData = await generateStructured(roleSys, roleTask, ['title', 'responsibilities', 'requirements']);
      kit.role = {
        title: roleData.title || '',
        seniority: roleData.seniority || '',
        responsibilities: roleData.responsibilities || [],
        requirements: roleData.requirements || []
      };
    } catch (e) {
      console.error('Failed to extract role requirements:', e);
      kit.role = { title: 'Unknown Role', seniority: '', responsibilities: [], requirements: [] };
    }

    // 4. Public Interview Research
    kit.generationStatus = 'Researching interview process...';
    await kit.save();

    const { researchInterviewProcess } = require('./research/interviewResearch');
    
    // Filter hiring pages from the existing research pages
    const hiringPages = research.pages.filter(p => p.category === 'hiring');
    const interviewResearchData = await researchInterviewProcess(kit.source.company, kit.role.title, hiringPages);

    kit.internal_research = {
      company_pages: research.pages,
      interview_process: interviewResearchData,
      failed_sources: research.failed_sources,
      warnings: research.research_warnings.concat(interviewResearchData.warnings || [])
    };

    // 5. Generate Question Bank & Guarantee Coverage
    kit.generationStatus = 'Generating interview questions...';
    await kit.save();

    const { runQuestionGenerationPipeline } = require('./generation/questionPipeline');
    await runQuestionGenerationPipeline(kit);

    // 6. Schedule Allocation
    kit.generationStatus = 'Allocating study schedule...';
    await kit.save();

    const { allocateSchedule } = require('./scheduling/scheduleAllocator');
    const daysAvailable = kit.schedule?.days_available || 5; // Default to 5 if somehow missing
    
    kit.schedule = allocateSchedule({
      requirements: kit.role.requirements,
      questions: kit.questions,
      daysAvailable: daysAvailable
    });

    kit.status = 'completed'; // Mark completed
    kit.generationStatus = 'Ready';
    await kit.save();
    
    return kit;
  } catch (error) {
    console.error('Research error:', error);
    // In a real system, we'd update kit status to 'failed' here
  }
};
