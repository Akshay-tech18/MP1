const logger = require("./logger");

const withExponentialBackoff = async (fn, maxRetries = 3, baseDelayMs = 1000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      const status = error?.response?.status || error?.status || error?.httpResponse?.status;
      const isPermanentError =
        status === 400 ||
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 404 ||
        error?.message?.includes("no remaining credits") ||
        error?.message?.includes("Payment Required") ||
        error?.message?.includes("credit balance");

      if (isPermanentError) {
        logger.warn(`Non-retryable API error encountered (${status || error.message}). Aborting retries.`);
        throw error;
      }
      
      if (attempt >= maxRetries) {
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
