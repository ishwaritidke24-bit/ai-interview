require('dotenv').config();
const { crawlCompany } = require('./src/services/retrieval');

(async () => {
  const url = process.argv[2] || 'https://example.com';
  console.log(`Starting crawl for: ${url}`);
  
  const results = await crawlCompany(url);
  
  console.log('\n--- Crawl Results ---');
  console.log(`Pages successfully scraped: ${results.pages.length}`);
  console.log(`Hiring pages found: ${results.hiring_pages.length}`);
  console.log(`Failed sources: ${results.failed_sources.length}`);
  console.log(`Warnings: ${results.research_warnings.join(', ') || 'None'}`);
  
  if (results.pages.length > 0) {
    console.log('\nSample Text from top page:');
    console.log(results.pages[0].text.substring(0, 200) + '...');
  }
})();
