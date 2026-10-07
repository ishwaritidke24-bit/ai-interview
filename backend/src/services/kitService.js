const Kit = require('../models/Kit');

exports.createKit = async (userId, kitData) => {
  const newKit = new Kit({
    userId,
    status: 'queued', // Use queued or draft based on the prompt
    source: {
      company: '',
      company_url: kitData.company_url,
      role: '',
      location: '',
      jd_chars: kitData.jd.length,
      researched_at: '',
      pages_used: []
    },
    company_brief: {
      summary: '',
      what_they_do: '',
      sources: []
    },
    role: {
      title: '',
      seniority: '',
      responsibilities: [],
      requirements: []
    },
    questions: [],
    flashcards: [],
    schedule: {
      days_available: kitData.days,
      days: []
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 0
    }
  });

  await newKit.save();
  return newKit;
};

exports.getUserKits = async (userId) => {
  return await Kit.find({ userId })
    .sort({ createdAt: -1 })
    .select('_id source.company_url source.company role.title status schedule.days_available createdAt');
};

exports.getUserKitById = async (kitId, userId) => {
  return await Kit.findOne({ _id: kitId, userId });
};
