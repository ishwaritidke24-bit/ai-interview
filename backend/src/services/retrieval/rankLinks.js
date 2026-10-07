exports.rankLinks = (links) => {
  const hiringTerms = ['careers', 'career', 'jobs', 'hiring', 'join us', 'work with us', 'openings'];
  const companyTerms = ['about', 'company', 'team', 'culture', 'handbook', 'engineering'];
  const negativeTerms = ['login', 'signin', 'privacy', 'terms', 'cookie', 'checkout', 'cart', 'support', 'help'];

  return links.map(link => {
    let score = 0;

    // Must be same origin to rank well
    if (!link.sameOrigin) {
      score -= 100;
      return { ...link, score };
    }

    const target = (link.anchorText + ' ' + link.path).toLowerCase();

    // Positive signals
    if (hiringTerms.some(term => target.includes(term))) score += 50;
    else if (companyTerms.some(term => target.includes(term))) score += 20;
    
    // Specific exact path bonuses
    if (link.path.match(/^\/(careers|jobs|about)(\/)?$/i)) score += 30;

    // Negative signals
    if (negativeTerms.some(term => target.includes(term))) score -= 50;

    // Depth penalty (simplistic: count slashes in path)
    const depth = (link.path.match(/\//g) || []).length;
    score -= depth * 2; 

    return { ...link, score };
  }).sort((a, b) => b.score - a.score);
};

exports.categorizePage = (title, url) => {
  const target = (title + ' ' + url).toLowerCase();
  if (target.includes('career') || target.includes('job') || target.includes('hiring')) return 'hiring';
  if (target.includes('about') || target.includes('company')) return 'company';
  if (target.includes('team') || target.includes('culture')) return 'culture';
  if (target.includes('engineering') || target.includes('tech')) return 'engineering';
  return 'general';
};
