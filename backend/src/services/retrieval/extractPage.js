const cheerio = require('cheerio');

exports.extractText = (html) => {
  if (!html) return '';
  
  const $ = cheerio.load(html);
  
  // Remove noise
  $('script, style, noscript, svg, nav, footer, header, iframe').remove();

  // Extract readable text, replace excessive whitespace
  let text = $('body').text();
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

exports.extractTitle = (html) => {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $('title').text().trim() || $('h1').first().text().trim() || '';
};
