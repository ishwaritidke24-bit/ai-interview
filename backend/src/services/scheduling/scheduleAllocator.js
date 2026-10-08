exports.allocateSchedule = ({ requirements, questions, daysAvailable }) => {
  if (!Number.isInteger(daysAvailable) || daysAvailable < 1 || daysAvailable > 60) {
    throw new Error('daysAvailable must be an integer between 1 and 60');
  }

  // 1. Setup Data Structures
  const reqPriorityMap = {};
  const reqTextMap = {};
  for (const r of requirements) {
    reqPriorityMap[r.id] = r.priority;
    reqTextMap[r.id] = r.text; // to help build focus
  }

  // Time mapping mapping
  const timeMapping = { 1: 10, 2: 15, 3: 20 };

  // Calculate score for each question to sort them deterministically
  const questionScores = questions.map(q => {
    // A question's priority is 'must' if ANY of its requirement_ids is a 'must'
    const isMust = (q.requirement_ids || []).some(id => reqPriorityMap[id] === 'must');
    const priorityScore = isMust ? 100 : 0;
    const diffScore = (parseInt(q.difficulty) || 1) * 10;
    const score = priorityScore + diffScore;

    return {
      id: q.id,
      category: q.category,
      score,
      minutes: timeMapping[parseInt(q.difficulty) || 1] || 10,
      isMust
    };
  });

  // Sort: highest score first
  questionScores.sort((a, b) => b.score - a.score);

  // 2. Initialize days
  const days = Array.from({ length: daysAvailable }, (_, i) => ({
    day: i + 1,
    focus: '',
    question_ids: [],
    minutes: 0,
    categories: new Set()
  }));

  // 3. Distribute Questions across days sequentially
  // If there are many questions, they'll wrap around. 
  // If there are few questions, they'll fill the first few days, leaving others empty.
  // We distribute them round-robin to balance workloads.
  
  for (let i = 0; i < questionScores.length; i++) {
    const q = questionScores[i];
    const dayIndex = i % daysAvailable;
    
    days[dayIndex].question_ids.push(q.id);
    days[dayIndex].minutes += q.minutes;
    days[dayIndex].categories.add(q.category);
  }

  // 4. Construct Focus for each day
  for (const day of days) {
    if (day.question_ids.length === 0) {
      day.focus = 'Review and consolidation';
    } else {
      const cats = Array.from(day.categories).filter(c => typeof c === 'string' && c.length > 0);
      day.focus = cats.length > 0 ? cats.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' & ') + ' Review' : 'General Review';
    }
    // Clean up temporary set
    delete day.categories;
  }

  return {
    days_available: daysAvailable,
    days
  };
};

exports.validateSchedule = (schedule, questions, requirements, daysAvailable) => {
  const errors = [];
  
  if (schedule.days_available !== daysAvailable) errors.push('days_available mismatch');
  if (!Array.isArray(schedule.days) || schedule.days.length !== daysAvailable) errors.push('days length mismatch');
  
  const scheduledQuestionIds = new Set();
  const validQuestionIds = new Set(questions.map(q => q.id));

  for (let i = 0; i < schedule.days.length; i++) {
    const day = schedule.days[i];
    if (day.day !== i + 1) errors.push(`Day sequence mismatch at index ${i}`);
    if (!Number.isInteger(day.minutes) || day.minutes < 0) errors.push(`Invalid minutes on day ${day.day}`);
    
    for (const qid of day.question_ids) {
      if (!validQuestionIds.has(qid)) errors.push(`Invalid question ID scheduled: ${qid}`);
      if (scheduledQuestionIds.has(qid)) errors.push(`Duplicate question ID scheduled: ${qid}`);
      scheduledQuestionIds.add(qid);
    }
  }

  // Check if every must requirement is represented in the schedule
  const mustReqIds = requirements.filter(r => r.priority === 'must').map(r => r.id);
  const coveredMustReqs = new Set();
  
  for (const qid of scheduledQuestionIds) {
    const q = questions.find(q => q.id === qid);
    if (q && q.requirement_ids) {
      q.requirement_ids.forEach(rid => {
        if (mustReqIds.includes(rid)) coveredMustReqs.add(rid);
      });
    }
  }

  const uncoveredMusts = mustReqIds.filter(rid => !coveredMustReqs.has(rid));
  if (uncoveredMusts.length > 0) {
    errors.push(`Must-have requirements not represented in schedule: ${uncoveredMusts.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
