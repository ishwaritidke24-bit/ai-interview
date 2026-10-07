exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.fetchWithRetry = async (url, options = {}, retries = 2) => {
  let lastError;
  let delay = 1000;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000); // 10s default timeout
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'AIInterviewPrepKit/1.0 (+http://localhost)',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);

      // Handle rate limits
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = res.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        throw new Error(`Retryable_Status_${res.status}_wait_${waitTime}`);
      }

      return res;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT'); // Do not retry timeouts indefinitely unless specific
      }
      if (i < retries && err.message.startsWith('Retryable_Status')) {
        const waitStr = err.message.split('_wait_')[1];
        const wait = waitStr ? parseInt(waitStr) : delay;
        await this.sleep(wait);
        delay *= 2; // Exponential backoff
        continue;
      }
      throw lastError; // Rethrow on non-retryable or if out of retries
    }
  }
};
