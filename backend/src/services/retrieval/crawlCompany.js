const { fetchPage } = require('./fetchPage');
const { isAllowed } = require('./robots');
const { extractText, extractTitle } = require('./extractPage');
const { discoverLinks } = require('./discoverLinks');
const { rankLinks, categorizePage } = require('./rankLinks');

const MAX_PAGES = 3;
const MAX_VISITS = 10;

// Primary crawler function
exports.crawlCompany = async (companyUrl) => {
  console.log('CRAWLER START');
  console.log('URL VALIDATION');
  const START_TIME = Date.now();
  const visited = new Set();
  const queue = [{ absoluteUrl: companyUrl, score: 100 }];
  const results = {
    company_url: companyUrl,
    pages: [],
    sources: [],
    failed_sources: [],
    hiring_pages: [],
    research_warnings: [],
    status: 'completed'
  };

  let visits = 0;
  const TIMEOUT_MS = parseInt(process.env.COMPANY_RESEARCH_TIMEOUT_MS || '30000');

  while (queue.length > 0 && results.pages.length < MAX_PAGES && visits < MAX_VISITS) {
    // Overall timeout check
    if (Date.now() - START_TIME > TIMEOUT_MS) {
      results.research_warnings.push('Company research timed out after ' + TIMEOUT_MS + 'ms');
      results.status = 'timed_out';
      console.log('[RESEARCH][ERROR]\nstage: researching_company\nurl: ' + companyUrl + '\nerror: TIMEOUT\nstack: N/A');
      break;
    }

    const nextLink = queue.shift();
    const url = nextLink.absoluteUrl;

    console.log('URL SAFETY CHECK');
    if (visited.has(url)) continue;
    visited.add(url);
    visits++;

    console.log('ROBOTS REQUEST START');
    const allowed = await isAllowed(url);
    console.log('ROBOTS REQUEST END');
    if (!allowed) {
      results.research_warnings.push(`Robots.txt blocked: ${url}`);
      console.log(`[RESEARCH][ROBOTS] blocked ${url}`);
      continue;
    }

    console.log('SEED PAGE FETCH START');
    const pageData = await fetchPage(url);
    console.log('SEED PAGE FETCH END');
    if (pageData.status === 'failed') {
      results.failed_sources.push({ url, status: 'failed', error: pageData.error });
      console.log(`[RESEARCH][FETCH DONE] ${url} failed ${pageData.error}`);
      continue;
    }
    console.log(`[RESEARCH][FETCH DONE] ${url} success ${Date.now() - START_TIME}ms`);

    console.log('HTML EXTRACTION START');
    const text = extractText(pageData.html);
    const title = extractTitle(pageData.html);
    const category = categorizePage(title, pageData.url);
    console.log('HTML EXTRACTION END');

    if (text.length > 100) {
      results.pages.push({
        url: pageData.url,
        title,
        text: text.substring(0, 10000),
        category
      });
      if (category === 'hiring') results.hiring_pages.push(pageData.url);
    }

    // Discover and rank new links
    if (results.pages.length < MAX_PAGES) {
      console.log('LINK DISCOVERY');
      const newLinks = discoverLinks(pageData.html, pageData.url);
      console.log('LINK RANKING');
      const rankedNewLinks = rankLinks(newLinks);
      for (const link of rankedNewLinks) {
        if (!visited.has(link.absoluteUrl) && link.score > 0) {
          queue.push(link);
        }
      }
      queue.sort((a, b) => b.score - a.score);
    }
  }

  console.log('CRAWLER END');
  if (results.hiring_pages.length === 0) {
    results.research_warnings.push('No explicit hiring/careers page found.');
  }
  const DURATION = Date.now() - START_TIME;
  console.log(`[RESEARCH][DONE] pages=${results.pages.length} duration=${DURATION}ms`);
  return results;
};
