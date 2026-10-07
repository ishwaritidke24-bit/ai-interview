const robotsParser = require('robots-parser');
const { fetchPage } = require('./fetchPage');

const cache = new Map();

exports.isAllowed = async (urlStr, userAgent = 'AIInterviewPrepKit') => {
  try {
    const url = new URL(urlStr);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    if (cache.has(robotsUrl)) {
      const robots = cache.get(robotsUrl);
      return robots ? robots.isAllowed(urlStr, userAgent) : true;
    }

    const res = await fetchPage(robotsUrl);
    if (res.status === 'success' && res.html) {
      const robots = robotsParser(robotsUrl, res.html);
      cache.set(robotsUrl, robots);
      return robots.isAllowed(urlStr, userAgent) !== false; // default to true if undefined
    } else {
      // If 404 or fails, we assume allowed (standard crawler behavior)
      cache.set(robotsUrl, null);
      return true;
    }
  } catch (err) {
    return true; // fail open for parsing errors on URL
  }
};
