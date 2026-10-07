const cheerio = require('cheerio');
const { URL } = require('url');

exports.discoverLinks = (html, baseUrl) => {
  if (!html) return [];
  const $ = cheerio.load(html);
  const links = new Map(); // Use map to deduplicate by absolute URL
  
  let baseObj;
  try {
    baseObj = new URL(baseUrl);
  } catch (e) {
    return [];
  }

  $('a').each((i, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    
    // Ignore clearly irrelevant links
    if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    try {
      // Resolve relative links
      const absoluteUrl = new URL(href, baseUrl);
      
      // Normalize: remove hash
      absoluteUrl.hash = '';

      const urlStr = absoluteUrl.toString();
      
      if (!links.has(urlStr)) {
        links.set(urlStr, {
          href,
          absoluteUrl: urlStr,
          anchorText: $(el).text().replace(/\s+/g, ' ').trim().toLowerCase(),
          rel: $(el).attr('rel') || '',
          sameOrigin: absoluteUrl.origin === baseObj.origin,
          path: absoluteUrl.pathname
        });
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  });

  return Array.from(links.values());
};
