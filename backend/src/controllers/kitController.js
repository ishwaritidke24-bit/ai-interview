const kitService = require('../services/kitService');
const { isValidUrl } = require('../utils/urlValidator');

exports.createKit = async (req, res) => {
  try {
    const { jd, company_url, days } = req.body;
    const userId = req.session.userId; // Guaranteed by requireAuth

    // Validation
    if (!jd || typeof jd !== 'string' || jd.trim().length === 0) {
      return res.status(400).json({ error: { message: 'Job description is required and must not be empty.' } });
    }

    if (!company_url || typeof company_url !== 'string' || !isValidUrl(company_url)) {
      return res.status(400).json({ error: { message: 'A valid company URL (http/https) is required.' } });
    }

    if (days === undefined || typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 60) {
      return res.status(400).json({ error: { message: 'Days until interview must be an integer between 1 and 60.' } });
    }

    // Pass data safely to service
    const kitData = {
      jd: jd.trim(),
      company_url: company_url.trim(),
      days
    };

    const newKit = await kitService.createKit(userId, kitData);

    res.status(201).json({
      kit: {
        id: newKit._id,
        status: newKit.status,
        source: {
          company_url: newKit.source.company_url,
          jd_chars: newKit.source.jd_chars
        }
      }
    });
  } catch (error) {
    console.error('Error creating kit:', error);
    res.status(500).json({ error: { message: 'Internal server error while creating kit.' } });
  }
};

exports.getKits = async (req, res) => {
  try {
    const userId = req.session.userId;
    const kits = await kitService.getUserKits(userId);
    
    // Map internal _id to id for consistency
    const mappedKits = kits.map(k => ({
      id: k._id,
      company: k.source?.company || '',
      company_url: k.source?.company_url || '',
      role: k.role?.title || '',
      status: k.status,
      days_available: k.schedule?.days_available || 0,
      createdAt: k.createdAt
    }));

    res.json({ kits: mappedKits });
  } catch (error) {
    console.error('Error fetching kits:', error);
    res.status(500).json({ error: { message: 'Internal server error while fetching kits.' } });
  }
};

exports.getKitById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const kit = await kitService.getUserKitById(id, userId);

    if (!kit) {
      return res.status(404).json({ error: { message: 'Kit not found.' } });
    }

    res.json({ kit });
  } catch (error) {
    console.error('Error fetching kit by id:', error);
    if (error.name === 'CastError') {
       return res.status(404).json({ error: { message: 'Kit not found.' } });
    }
    res.status(500).json({ error: { message: 'Internal server error while fetching kit.' } });
  }
};

exports.updateKit = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    // Fields allowed to be updated from the builder
    const { company_brief, role, questions, flashcards } = req.body;

    const kit = await kitService.getUserKitById(id, userId);

    if (!kit) {
      return res.status(404).json({ error: { message: 'Kit not found.' } });
    }

    // Safely update provided fields
    if (company_brief) kit.company_brief = company_brief;
    if (role) kit.role = role;
    if (questions) kit.questions = questions;
    if (flashcards) kit.flashcards = flashcards;

    await kit.save();

    res.json({ success: true, kit });
  } catch (error) {
    console.error('Error updating kit:', error);
    res.status(500).json({ error: { message: 'Internal server error while updating kit.' } });
  }
};

exports.regenerateSection = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { section, category } = req.body;

    const kit = await kitService.getUserKitById(id, userId);
    if (!kit) return res.status(404).json({ error: { message: 'Kit not found.' } });

    if (section === 'company_brief') {
      const { generateStructured } = require('../services/generation/llmClient');
      const { getCompanyBriefPrompt } = require('../services/generation/prompts');
      const researchPages = kit.internal_research?.company_pages || [];
      if (researchPages.length > 0) {
        const { systemInstruction: briefSys, taskPrompt: briefTask } = getCompanyBriefPrompt(researchPages);
        const companyBriefData = await generateStructured(briefSys, briefTask, ['summary', 'what_they_do', 'sources']);
        kit.company_brief = {
          summary: companyBriefData.summary || '',
          what_they_do: companyBriefData.what_they_do || '',
          sources: companyBriefData.sources || []
        };
        await kit.save();
      }
    } else if (section === 'questions' && category) {
      // Delete unpinned questions of this category
      kit.questions = kit.questions.filter(q => q.category !== category || q.pinned);
      
      const { generateQuestionsForKit } = require('../services/generation/questionGenerator');
      
      // Ideally we would only generate questions for requirements that naturally map to this category.
      // But the generator determines categories natively from requirements.
      // We will re-run the generator over all requirements, but only keep questions that map to this target category
      // and whose requirements aren't fully saturated. For simplicity, we just generate and filter.
      const newQuestions = await generateQuestionsForKit(kit); // Doesn't save directly
      const filtered = newQuestions.filter(q => q.category === category);
      
      // Append the newly generated questions for this category
      kit.questions.push(...filtered);
      
      // Let's run coverage to make sure it's intact
      const { checkCoverage } = require('../services/coverage/coverageChecker');
      const coverageResult = checkCoverage(kit.role.requirements, kit.questions);
      kit.coverage = {
        uncovered_requirement_ids: coverageResult.uncovered_requirement_ids,
        passes: kit.coverage?.passes || 0
      };
      
      await kit.save();
    } else if (section === 'schedule') {
      const { allocateSchedule } = require('../services/scheduling/scheduleAllocator');
      const daysAvailable = kit.schedule?.days_available || 5;
      kit.schedule = allocateSchedule({
        requirements: kit.role.requirements,
        questions: kit.questions, // This relies on the current edited state!
        daysAvailable
      });
      await kit.save();
    } else {
      return res.status(400).json({ error: { message: 'Invalid regeneration target.' } });
    }

    res.json({ success: true, kit });
  } catch (error) {
    console.error('Error regenerating section:', error);
    res.status(500).json({ error: { message: 'Internal server error while regenerating section.' } });
  }
};
