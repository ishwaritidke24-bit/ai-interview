exports.checkCoverage = (requirements, questions) => {
  const coveredReqIds = new Set();
  const validReqIds = new Set(requirements.map(r => r.id));

  // A requirement is covered if AT LEAST ONE valid question references its ID
  for (const q of questions) {
    if (q.requirement_ids && Array.isArray(q.requirement_ids)) {
      for (const reqId of q.requirement_ids) {
        if (validReqIds.has(reqId)) {
          coveredReqIds.add(reqId);
        }
      }
    }
  }

  const uncoveredReqIds = [];
  const uncoveredMustReqIds = [];
  const uncoveredNiceReqIds = [];

  for (const r of requirements) {
    if (!coveredReqIds.has(r.id)) {
      uncoveredReqIds.push(r.id);
      if (r.priority === 'must') {
        uncoveredMustReqIds.push(r.id);
      } else {
        uncoveredNiceReqIds.push(r.id);
      }
    }
  }

  return {
    uncovered_requirement_ids: uncoveredReqIds,
    uncovered_must_requirement_ids: uncoveredMustReqIds,
    uncovered_nice_requirement_ids: uncoveredNiceReqIds,
    covered_requirement_ids: Array.from(coveredReqIds),
    total_requirements: requirements.length,
    covered_count: coveredReqIds.size,
    passes_all_must: uncoveredMustReqIds.length === 0
  };
};
