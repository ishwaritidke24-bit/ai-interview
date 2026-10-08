const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String }],
  category: { type: String, required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 3, required: true },
}, { _id: false });

const flashcardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String }],
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  focus: { type: String, required: true },
  question_ids: [{ type: String }],
  minutes: { type: Number, required: true },
}, { _id: false });

const kitSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  status: {
    type: String,
    enum: ['queued', 'generating', 'completed', 'failed'],
    default: 'queued'
  },
  generationStatus: {
    type: String
  },
  generationStage: {
    type: String
  },
  generationError: {
    code: { type: String },
    message: { type: String }
  },
  source: {
    company: { type: String },
    company_url: { type: String },
    role: { type: String },
    location: { type: String },
    jd_chars: { type: Number },
    jd_text: { type: String },
    researched_at: { type: String },
    pages_used: [{ type: String }]
  },
  company_brief: {
    summary: { type: String },
    what_they_do: { type: String },
    sources: [{ type: String }]
  },
  role: {
    title: { type: String },
    seniority: { type: String },
    responsibilities: [{ type: String }],
    requirements: [requirementSchema]
  },
  internal_research: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  questions: [questionSchema],
  flashcards: [flashcardSchema],
  practice: {
    type: Map,
    of: new mongoose.Schema({
      confidence: { type: Number, min: 1, max: 5 },
      attempts: { type: Number, default: 0 },
      lastPracticedAt: { type: Date }
    }, { _id: false }),
    default: {}
  },
  schedule: {
    days_available: { type: Number },
    days: [daySchema]
  },
  coverage: {
    uncovered_requirement_ids: [{ type: String }],
    passes: { type: Number, default: 0 }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexing for fast retrieval of a user's kits
kitSchema.index({ userId: 1, createdAt: -1 });

const Kit = mongoose.model('Kit', kitSchema);

module.exports = Kit;
