/**
 * Canonical Kit Schema definitions
 * Defines the structure as required in Appendix A.
 */

const KitSchema = {
  // Add validation definitions here later
  source: {
    company: 'string',
    company_url: 'string',
    role: 'string',
    location: 'string',
    jd_chars: 'number',
    researched_at: 'string', // ISO date
    pages_used: ['string']
  },
  company_brief: {
    summary: 'string',
    what_they_do: 'string',
    sources: ['string']
  },
  role: {
    title: 'string',
    seniority: 'string',
    responsibilities: ['string'],
    requirements: [
      {
        id: 'string',
        text: 'string',
        kind: 'string',
        priority: 'string' // 'must' | 'nice'
      }
    ]
  },
  questions: [
    {
      id: 'string',
      requirement_ids: ['string'],
      category: 'string',
      prompt: 'string',
      answer_outline: 'string',
      difficulty: 'number' // 1-3
    }
  ],
  flashcards: [
    {
      id: 'string',
      front: 'string',
      back: 'string',
      requirement_ids: ['string']
    }
  ],
  schedule: {
    days_available: 'number',
    days: [
      {
        day: 'number',
        focus: 'string',
        question_ids: ['string'],
        minutes: 'number'
      }
    ]
  },
  coverage: {
    uncovered_requirement_ids: ['string'],
    passes: 'boolean'
  }
};

module.exports = { KitSchema };
