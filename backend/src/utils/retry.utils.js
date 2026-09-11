const logger = require("./logger");

const withExponentialBackoff = async (fn, maxRetries = 3, baseDelayMs = 1000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      // Check if it's a rate limit error (429) or standard network error
      const isRateLimit = error?.response?.status === 429 || error?.status === 429 || error?.message?.includes("429");
      
      if (attempt >= maxRetries || (!isRateLimit && attempt >= maxRetries)) {
        logger.error(`Failed after ${attempt} attempts: ${error.message}`);
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`API Rate limit or network error. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

module.exports = { withExponentialBackoff };
