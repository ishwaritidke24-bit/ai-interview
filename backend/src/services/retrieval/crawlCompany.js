const { fetchPage } = require('./fetchPage');
const { isAllowed } = require('./robots');
const { extractText, extractTitle } = require('./extractPage');
const { discoverLinks } = require('./discoverLinks');
const { rankLinks, categorizePage } = require('./rankLinks');

const MAX_PAGES = 3;

exports.crawlCompany = async (companyUrl) => {
  const visited = new Set();
  const queue = [{ absoluteUrl: companyUrl, score: 100 }];
  const results = {
    company_url: companyUrl,
    pages: [],
    sources: [],
    failed_sources: [],
    hiring_pages: [],
    research_warnings: []
  };

  while (queue.length > 0 && results.pages.length < MAX_PAGES) {
    // Take highest scored link
    const nextLink = queue.shift();
    const url = nextLink.absoluteUrl;

    if (visited.has(url)) continue;
    visited.add(url);

    // Robots.txt check
    const allowed = await isAllowed(url);
    if (!allowed) {
      results.research_warnings.push(`Robots.txt blocked: ${url}`);
      continue;
    }

    // Fetch
    const pageData = await fetchPage(url);
    if (pageData.status === 'failed') {
      results.failed_sources.push({ url, status: 'failed', error: pageData.error });
      continue;
    }

    results.sources.push(pageData.url);
    visited.add(pageData.url); // Add final resolved url to visited

    // Extract
    const text = extractText(pageData.html);
    const title = extractTitle(pageData.html);
    const category = categorizePage(title, pageData.url);

    if (text.length > 100) { // Only save pages with actual content
      results.pages.push({
        url: pageData.url,
        title,
        text: text.substring(0, 10000), // Cap length per page
        category
      });

      if (category === 'hiring') {
        results.hiring_pages.push(pageData.url);
      }
    }

    // Discover & rank new links
    if (results.pages.length < MAX_PAGES) {
      const newLinks = discoverLinks(pageData.html, pageData.url);
      const rankedNewLinks = rankLinks(newLinks);
      
      for (const link of rankedNewLinks) {
        if (!visited.has(link.absoluteUrl) && link.score > 0) {
          queue.push(link);
        }
      }
      // Re-sort queue
      queue.sort((a, b) => b.score - a.score);
    }
  }

  if (results.hiring_pages.length === 0) {
    results.research_warnings.push("No explicit hiring/careers page found.");
  }

  return results;
};
