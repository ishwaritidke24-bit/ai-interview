const { fetchWithRetry } = require('./rateLimiter');
const { isSafeUrl } = require('../../utils/urlSafety');

exports.fetchPage = async (url) => {
  if (!isSafeUrl(url)) {
    return { url, status: 'failed', error: 'UNSAFE_URL' };
  }

  try {
    const res = await fetchWithRetry(url, { timeout: 15000 });
    
    if (!res.ok) {
      return { url, status: 'failed', error: `HTTP_${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { url, status: 'failed', error: 'UNSUPPORTED_CONTENT_TYPE' };
    }

    // Check size limit (approximate max 2MB)
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      return { url, status: 'failed', error: 'CONTENT_TOO_LARGE' };
    }

    const text = await res.text();
    if (text.length > 2 * 1024 * 1024) { // Secondary check
      return { url, status: 'failed', error: 'CONTENT_TOO_LARGE' };
    }

    return {
      url: res.url, // final url after redirects
      status: 'success',
      contentType,
      html: text
    };
  } catch (error) {
    return { url, status: 'failed', error: error.message };
  }
};
