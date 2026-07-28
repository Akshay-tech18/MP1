const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

/**
 * Get project dashboard metrics
 */
const getDashboardMetrics = async (req, res) => {
  const projectId = req.params.id;

  try {
    // 1. Task distribution by status
    const taskStatusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { id: true }
    });

    const statusDistribution = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      COMPLETED: 0,
      BLOCKED: 0
    };
    taskStatusCounts.forEach(item => {
      statusDistribution[item.status] = item._count.id;
    });

    // 2. Active sprint completion
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId, status: "ACTIVE" }
    });

    let activeSprintData = null;
    if (activeSprint) {
      const totalTasks = await prisma.task.count({
        where: { sprintId: activeSprint.id }
      });
      const completedTasks = await prisma.task.count({
        where: { sprintId: activeSprint.id, status: "COMPLETED" }
      });
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      activeSprintData = {
        id: activeSprint.id,
        name: activeSprint.name,
        goal: activeSprint.goal,
        totalTasks,
        completedTasks,
        completionRate
      };
    }

    // 3. Commit Trend (30-day) - DB Agnostic JavaScript-based grouping for robustness
    const repos = await prisma.repository.findMany({
      where: { projectId },
      select: { id: true }
    });
    const repoIds = repos.map(r => r.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const commits = await prisma.commit.findMany({
      where: {
        repoId: { in: repoIds },
        committedAt: { gte: thirtyDaysAgo }
      },
      select: { committedAt: true }
    });

    // Initialize 30-day trend map
    const trendMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      trendMap[dateStr] = 0;
    }

    // Populate trend data
    commits.forEach(commit => {
      const dateStr = commit.committedAt.toISOString().split("T")[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    });

    const commitTrend = Object.keys(trendMap).map(day => ({
      day,
      count: trendMap[day]
    }));

    // 4. Recent activity feed (last 20 events)
    const recentActivity = await prisma.activityLog.findMany({
      where: { projectId },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // 5. Bug risk summary (count per level)
    const riskResults = await prisma.predictionResult.groupBy({
      by: ["xgboostRisk"],
      where: {
        repository: { projectId }
      },
      _count: { id: true }
    });

    const bugRiskSummary = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    riskResults.forEach(item => {
      bugRiskSummary[item.xgboostRisk] = item._count.id;
    });

    return sendSuccess(res, 200, "Dashboard metrics compiled", {
      statusDistribution,
      activeSprint: activeSprintData,
      commitTrend,
      recentActivity,
      bugRiskSummary
    });
  } catch (error) {
    logger.error("Dashboard metrics aggregation error: %o", error);
    return sendError(res, 500, "Failed to aggregate dashboard metrics");
  }
};

/**
 * Get report for a specific sprint
 */
const getSprintReport = async (req, res) => {
  const { id: projectId, sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint || sprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    // 1. Task distribution by status
    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: { sprintId },
      _count: { id: true }
    });

    // 2. Task distribution by priority
    const priorityCounts = await prisma.task.groupBy({
      by: ["priority"],
      where: { sprintId },
      _count: { id: true }
    });

    // 3. Per-assignee completed vs total tasks
    const tasks = await prisma.task.findMany({
      where: { sprintId },
      select: {
        status: true,
        assignee: { select: { id: true, name: true, avatar: true } }
      }
    });

    const assigneeStatsMap = {};
    tasks.forEach(task => {
      const assigneeId = task.assignee ? task.assignee.id : "Unassigned";
      const assigneeName = task.assignee ? task.assignee.name : "Unassigned";
      const assigneeAvatar = task.assignee ? task.assignee.avatar : "";

      if (!assigneeStatsMap[assigneeId]) {
        assigneeStatsMap[assigneeId] = {
          name: assigneeName,
          avatar: assigneeAvatar,
          assigned: 0,
          completed: 0
        };
      }
      assigneeStatsMap[assigneeId].assigned++;
      if (task.status === "COMPLETED") {
        assigneeStatsMap[assigneeId].completed++;
      }
    });

    const assigneePerformance = Object.keys(assigneeStatsMap).map(id => ({
      userId: id,
      ...assigneeStatsMap[id]
    }));

    // 4. Completed tasks timeline
    const completedTasks = await prisma.task.findMany({
      where: { sprintId, status: "COMPLETED" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        assignee: { select: { name: true } }
      },
      orderBy: { updatedAt: "asc" }
    });

    return sendSuccess(res, 200, "Sprint report compiled", {
      sprint: {
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate
      },
      statusDistribution: statusCounts.map(c => ({ status: c.status, count: c._count.id })),
      priorityDistribution: priorityCounts.map(p => ({ priority: p.priority, count: p._count.id })),
      assigneePerformance,
      completedTimeline: completedTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        completedAt: t.updatedAt,
        assigneeName: t.assignee ? t.assignee.name : "Unassigned"
      }))
    });
  } catch (error) {
    logger.error("Sprint report compilation error: %o", error);
    return sendError(res, 500, "Failed to compile sprint report");
  }
};

/**
 * Get bug risk ranked report for repository files
 */
const getBugRiskReport = async (req, res) => {
  const projectId = req.params.id;

  try {
    const predictions = await prisma.predictionResult.findMany({
      where: {
        repository: { projectId }
      },
      include: {
        repository: { select: { name: true } }
      }
    });

    // Custom sorting: CRITICAL -> HIGH -> MEDIUM -> LOW.
    // Within each class, sort by confidence score descending.
    const riskRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    const sortedPredictions = predictions.sort((a, b) => {
      const aRank = riskRank[a.xgboostRisk] || 0;
      const bRank = riskRank[b.xgboostRisk] || 0;

      if (aRank !== bRank) {
        return bRank - aRank; // Higher risk first
      }

      // If equal, sort by confidence descending
      return b.xgboostConfidence - a.xgboostConfidence;
    });

    return sendSuccess(res, 200, "Bug risk report retrieved", {
      predictions: sortedPredictions.map(p => ({
        id: p.id,
        filePath: p.filePath,
        repoName: p.repository.name,
        commitFrequency: p.commitFrequency,
        codeChurn: p.codeChurn,
        numContributors: p.numContributors,
        prCount: p.prCount,
        bugFixRatio: p.bugFixRatio,
        xgboostRisk: p.xgboostRisk,
        xgboostConfidence: Math.round(p.xgboostConfidence * 100),
        rfRisk: p.rfRisk,
        rfConfidence: Math.round(p.rfConfidence * 100),
        agreement: p.agreement
      }))
    });
  } catch (error) {
    logger.error("Bug risk report query error: %o", error);
    return sendError(res, 500, "Failed to retrieve bug risk analysis");
  }
};

module.exports = {
  getDashboardMetrics,
  getSprintReport,
  getBugRiskReport
};
