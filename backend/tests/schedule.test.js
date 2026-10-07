const { allocateSchedule, validateSchedule } = require('../src/services/scheduling/scheduleAllocator');

describe('Schedule Allocator', () => {
  const reqs = [
    { id: 'r1', priority: 'must', text: 'React' },
    { id: 'r2', priority: 'nice', text: 'SQL' }
  ];

  const questions = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', difficulty: 3 }, // score 130
    { id: 'q2', requirement_ids: ['r1'], category: 'behavioural', difficulty: 1 }, // score 110
    { id: 'q3', requirement_ids: ['r2'], category: 'technical', difficulty: 2 }, // score 20
  ];

  it('allocates exactly requested days and validates', () => {
    const schedule = allocateSchedule({ requirements: reqs, questions, daysAvailable: 5 });
    
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);
    expect(schedule.days[0].day).toBe(1);
    expect(schedule.days[4].day).toBe(5);

    const validation = validateSchedule(schedule, questions, reqs, 5);
    expect(validation.valid).toBe(true);
  });

  it('1 day allocation puts everything on day 1', () => {
    const schedule = allocateSchedule({ requirements: reqs, questions, daysAvailable: 1 });
    
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].question_ids.length).toBe(3); // All questions
    expect(schedule.days[0].minutes).toBe(20 + 10 + 15); // Sum of time mapping
  });

  it('60 days allocation distributes and pads with review days', () => {
    const schedule = allocateSchedule({ requirements: reqs, questions, daysAvailable: 60 });
    
    expect(schedule.days.length).toBe(60);
    expect(schedule.days[0].question_ids).toContain('q1');
    expect(schedule.days[3].question_ids.length).toBe(0);
    expect(schedule.days[3].focus).toBe('Review and consolidation');
    expect(schedule.days[3].minutes).toBe(0);
  });

  it('prioritizes must/hard questions early via round-robin', () => {
    // q1 (must/diff 3) should be day 1
    // q2 (must/diff 1) should be day 2
    // q3 (nice/diff 2) should be day 3
    const schedule = allocateSchedule({ requirements: reqs, questions, daysAvailable: 3 });
    
    expect(schedule.days[0].question_ids[0]).toBe('q1');
    expect(schedule.days[1].question_ids[0]).toBe('q2');
    expect(schedule.days[2].question_ids[0]).toBe('q3');
  });

  it('zero questions safely allocates empty days', () => {
    const schedule = allocateSchedule({ requirements: reqs, questions: [], daysAvailable: 2 });
    
    expect(schedule.days.length).toBe(2);
    expect(schedule.days[0].question_ids.length).toBe(0);
    expect(schedule.days[0].minutes).toBe(0);
  });

  it('deterministic output', () => {
    const s1 = allocateSchedule({ requirements: reqs, questions, daysAvailable: 4 });
    const s2 = allocateSchedule({ requirements: reqs, questions, daysAvailable: 4 });
    expect(s1).toEqual(s2);
  });
});
