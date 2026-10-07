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

    kit.status = 'completed'; // Mark completed for now since question generation isn't built yet
    kit.generationStatus = 'Ready';
    await kit.save();
    
    return kit;
  } catch (error) {
    console.error('Research error:', error);
    // In a real system, we'd update kit status to 'failed' here
  }
};
