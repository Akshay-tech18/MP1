/**
 * Format minutes into a human-readable duration string.
 * Examples:
 *   45 -> "45m"
 *   120 -> "2h"
 *   150 -> "2h 30m"
 *   0 -> "0m"
 */
export const formatDuration = (minutes) => {
  const m = Math.round(Number(minutes));
  if (!m || isNaN(m) || m <= 0) return "0m";
  const hours = Math.floor(m / 60);
  const remainingMins = m % 60;

  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMins}m`;
};

/**
 * Calculate progress percentage and remaining time between spent and estimated minutes.
 */
export const calculateTimeProgress = (timeSpent = 0, estimatedTime = 0) => {
  const spent = Math.max(0, Number(timeSpent) || 0);
  const est = Math.max(0, Number(estimatedTime) || 0);

  if (est === 0) {
    return {
      percentage: spent > 0 ? 100 : 0,
      isOverBudget: false,
      remainingMinutes: 0,
      overMinutes: 0,
    };
  }

  const percentage = Math.round((spent / est) * 100);
  const isOverBudget = spent > est;
  const remainingMinutes = Math.max(0, est - spent);
  const overMinutes = isOverBudget ? spent - est : 0;

  return {
    percentage,
    isOverBudget,
    remainingMinutes,
    overMinutes,
  };
};
