exports.validateKit = (kit) => {
  if (!kit.source) throw new Error('Missing source');
  if (!kit.company_brief) throw new Error('Missing company_brief');
  if (!kit.role) throw new Error('Missing role');
  if (!kit.questions || kit.questions.length === 0) throw new Error('Missing questions');
  if (!kit.flashcards || kit.flashcards.length === 0) throw new Error('Missing flashcards');
  if (!kit.schedule) throw new Error('Missing schedule');
  if (!kit.coverage) throw new Error('Missing coverage');

  kit.questions.forEach((q, i) => {
    if (!q.id) throw new Error(`Question ${i} missing id`);
    if (!q.requirement_ids || q.requirement_ids.length === 0) throw new Error(`Question ${q.id} missing requirement_ids`);
    q.requirement_ids.forEach(rId => {
      if (!kit.role.requirements.find(r => r.id === rId)) {
        throw new Error(`Question ${q.id} references non-existent requirement ${rId}`);
      }
    });
    if (!q.category) throw new Error(`Question ${q.id} missing category`);
    if (!q.prompt) throw new Error(`Question ${q.id} missing prompt`);
    if (!q.answer_outline) throw new Error(`Question ${q.id} missing answer_outline`);
    if (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 3) {
      throw new Error(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
    }
  });

  if (!kit.schedule.days || kit.schedule.days.length !== kit.schedule.days_available) {
    throw new Error(`Schedule missing days or days length does not match days_available`);
  }

  kit.schedule.days.forEach(d => {
    if (typeof d.day !== 'number') throw new Error('Schedule day missing or not a number');
    if (!d.focus) throw new Error(`Schedule day ${d.day} missing focus`);
    if (typeof d.minutes !== 'number') throw new Error(`Schedule day ${d.day} missing minutes`);
    if (!d.question_ids) throw new Error(`Schedule day ${d.day} missing question_ids`);
    d.question_ids.forEach(qId => {
      if (!kit.questions.find(q => q.id === qId)) {
        throw new Error(`Schedule day ${d.day} references non-existent question ${qId}`);
      }
    });
  });
};
