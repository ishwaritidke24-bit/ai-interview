const express = require('express');
const router = express.Router({ mergeParams: true }); // Allows access to :kitId from parent router
const Kit = require('../models/Kit');

// Helper to determine next card
const getNextCard = (flashcards, practiceMap) => {
  if (!flashcards || flashcards.length === 0) return null;

  // Compute a sorting score for each card
  const cardsWithStats = flashcards.map(card => {
    const stat = practiceMap.get(card.id) || { attempts: 0, confidence: 0, lastPracticedAt: new Date(0) };
    return {
      id: card.id,
      card,
      attempts: stat.attempts,
      confidence: stat.confidence, // 0 if unpracticed
      lastPracticedAt: stat.lastPracticedAt ? new Date(stat.lastPracticedAt).getTime() : 0
    };
  });

  // Sort logic:
  // 1. Unpracticed first (attempts === 0)
  // 2. Lowest confidence first
  // 3. Oldest practiced first (least recently practiced)
  // 4. Tie-breaker: ID
  cardsWithStats.sort((a, b) => {
    if (a.attempts === 0 && b.attempts > 0) return -1;
    if (b.attempts === 0 && a.attempts > 0) return 1;

    if (a.confidence !== b.confidence) return a.confidence - b.confidence;
    if (a.lastPracticedAt !== b.lastPracticedAt) return a.lastPracticedAt - b.lastPracticedAt;
    
    return a.id.localeCompare(b.id);
  });

  return cardsWithStats[0].card;
};

// GET /api/kits/:kitId/practice
router.get('/', async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.kitId, userId: req.session.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const total = kit.flashcards.length;
    let practiced = 0;
    
    // Map existing stats
    const confidenceMap = {};
    for (const [fId, stats] of kit.practice.entries()) {
      confidenceMap[fId] = stats;
      if (stats.attempts > 0) practiced++;
    }

    const nextCard = getNextCard(kit.flashcards, kit.practice);

    res.json({
      total,
      practiced,
      unpracticed: total - practiced,
      confidenceMap,
      nextCard
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving practice state' });
  }
});

// POST /api/kits/:kitId/practice/:flashcardId
router.post('/:flashcardId', async (req, res) => {
  try {
    const { confidence } = req.body;
    
    // Validate confidence
    if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
      return res.status(400).json({ error: 'Confidence must be an integer between 1 and 5' });
    }

    const kit = await Kit.findOne({ _id: req.params.kitId, userId: req.session.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    // Validate flashcard ID exists
    const cardExists = kit.flashcards.some(f => f.id === req.params.flashcardId);
    if (!cardExists) return res.status(404).json({ error: 'Flashcard not found in this kit' });

    // Safely update practice state
    const currentStats = kit.practice.get(req.params.flashcardId) || { attempts: 0 };
    
    kit.practice.set(req.params.flashcardId, {
      confidence,
      attempts: currentStats.attempts + 1,
      lastPracticedAt: new Date()
    });

    await kit.save(); // Atomic isolated update because Mongoose Maps track changes efficiently

    res.json({ success: true, flashcardId: req.params.flashcardId, confidence });
  } catch (error) {
    res.status(500).json({ error: 'Server error recording practice result' });
  }
});

module.exports = router;
