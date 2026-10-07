const { fetchPage } = require('../retrieval/fetchPage');
const { extractText } = require('../retrieval/extractPage');
const { generateStructured } = require('../generation/llmClient');
const { getInterviewResearchPrompt } = require('../generation/prompts');

// This uses DuckDuckGo HTML for a free, no-API-key search of public web
const searchPublicWeb = async (query) => {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const searchRes = await fetchPage(url);
  if (searchRes.status === 'failed') return [];

  const text = extractText(searchRes.html);
  
  // Extract simple snippets from the page (this is highly simplistic since we aren't using a real SerpApi)
  // For production, we'd fetch the actual URLs found in the search results.
  // Given time limits and constraints, we'll return the text of the search page itself which contains snippets
  return [{
    url,
    title: `Search: ${query}`,
    source_type: 'public_interview_discussion',
    text: text.substring(0, 5000)
  }];
};

exports.researchInterviewProcess = async (companyName, roleTitle, hiringPages = []) => {
  const sources = [];
  let combinedText = '';

  // 1. Add known hiring pages from previous crawl
  for (const page of hiringPages) {
    sources.push({
      url: page.url,
      title: page.title,
      source_type: 'company_hiring_page'
    });
    combinedText += `\n[Source: ${page.url}]\n${page.text.substring(0, 3000)}`;
  }

  // 2. Perform public search if company name is available
  if (companyName) {
    const query = `"${companyName}" ${roleTitle || ''} interview process experiences questions`;
    const searchResults = await searchPublicWeb(query);
    
    for (const result of searchResults) {
      sources.push({
        url: result.url,
        title: result.title,
        source_type: result.source_type
      });
      combinedText += `\n[Source: ${result.url}]\n${result.text}`;
    }
  }

  // 3. Extract findings
  if (!combinedText.trim()) {
    return {
      status: 'no_results',
      findings: [],
      sources,
      warnings: ['No reliable public interview-process information found.']
    };
  }

  const { systemInstruction, taskPrompt } = getInterviewResearchPrompt(combinedText);
  try {
    const structuredData = await generateStructured(systemInstruction, taskPrompt, ['status', 'findings', 'warnings']);
    
    if (structuredData.status === 'no_results') {
      return {
        status: 'no_results',
        findings: [],
        sources,
        warnings: structuredData.warnings.length > 0 ? structuredData.warnings : ['No reliable public interview-process information found.']
      };
    }

    return {
      status: structuredData.status || 'found',
      findings: structuredData.findings || [],
      sources,
      warnings: structuredData.warnings || []
    };
  } catch (error) {
    return {
      status: 'no_results',
      findings: [],
      sources,
      warnings: ['LLM processing failed: ' + error.message]
    };
  }
};
