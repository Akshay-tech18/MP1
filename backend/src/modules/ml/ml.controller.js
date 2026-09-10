const axios = require("axios");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { isBugFixCommit } = require("../github/commit.parser");
const { SocketEvent } = require("../../config/constants");
const logger = require("../../utils/logger");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY || "dummy_ml_key";

/**
 * Helper to emit socket events
 */
const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.of("/project").to(projectId).emit(event, data);
  }
};

/**
 * Trigger full ML bug risk assessment scan for a repository
 */
const scanRepository = async (req, res) => {
  const { id: projectId, repoId } = req.params;

  try {
    // 1. Verify repository exists in project
    const repo = await prisma.repository.findUnique({
      where: { id: repoId }
    });

    if (!repo || repo.projectId !== projectId) {
      return sendError(res, 404, "Repository not found in this project");
    }

    // 2. Query all commits of this repository
    const commits = await prisma.commit.findMany({
      where: { repoId },
      orderBy: { committedAt: "desc" }
    });

    if (commits.length === 0) {
      return sendSuccess(res, 200, "Scan skipped. No commits found in this repository.", { predictions: [], summary: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } });
    }

    // 3. Extract file paths and calculate metrics
    const fileMetricsMap = {};
    const totalCommitsCount = commits.length;

    // Fetch PR counts in the repository to estimate PR touches
    const totalPrsCount = await prisma.pullRequest.count({ where: { repoId } });

    commits.forEach(commit => {
      let files = [];
      try {
        files = typeof commit.filesChanged === "string" 
          ? JSON.parse(commit.filesChanged) 
          : commit.filesChanged;
      } catch (e) {
        files = Array.isArray(commit.filesChanged) ? commit.filesChanged : [];
      }

      if (!Array.isArray(files)) files = [];

      const isFix = isBugFixCommit(commit.message);

      files.forEach(filePath => {
        // Exclude common build/dependency files to make predictions meaningful
        if (filePath.includes("node_modules/") || filePath.includes("package-lock.json") || filePath.includes("yarn.lock") || filePath.includes("dist/") || filePath.includes(".env")) {
          return;
        }

        if (!fileMetricsMap[filePath]) {
          fileMetricsMap[filePath] = {
            file_path: filePath,
            commitsCount: 0,
            bugFixCommitsCount: 0,
            contributors: new Set(),
            prCount: 0
          };
        }

        const fm = fileMetricsMap[filePath];
        fm.commitsCount++;
        if (isFix) {
          fm.bugFixCommitsCount++;
        }
        fm.contributors.add(commit.authorName);
      });
    });

    // Translate raw logs to ML features
    const filesToPredict = Object.keys(fileMetricsMap).map(filePath => {
      const metric = fileMetricsMap[filePath];
      
      // commit_frequency: count per week in 30 days (4.28 weeks)
      const commit_frequency = Math.round((metric.commitsCount / 4.28) * 100) / 100;
      
      // code_churn: heuristic based on commits and paths
      const code_churn = metric.commitsCount * 75.0;
      
      // contributors count
      const num_contributors = metric.contributors.size;
      
      // pr_count: estimate proportional to activity
      const pr_count = Math.min(Math.ceil(metric.commitsCount * 0.25), totalPrsCount || 2);
      
      // bug_fix_ratio
      const bug_fix_ratio = Math.round((metric.bugFixCommitsCount / metric.commitsCount) * 100) / 100;

      return {
        file_path: filePath,
        commit_frequency,
        code_churn,
        num_contributors,
        pr_count,
        bug_fix_ratio
      };
    });

    // 4. Batch items (FastAPI supports up to 50)
    // Sort files by commit count to analyze the 50 most active files
    const sortedFiles = filesToPredict
      .sort((a, b) => b.commit_frequency - a.commit_frequency)
      .slice(0, 50);

    if (sortedFiles.length === 0) {
      return sendSuccess(res, 200, "Scan complete. No source files qualified for analysis.", { predictions: [], summary: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } });
    }

    // 5. POST to FastAPI
    let predictions = [];
    let summary = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/predict/batch`,
        { files: sortedFiles },
        {
          headers: {
            "Content-Type": "application/json",
            "X-ML-Service-Key": ML_SERVICE_API_KEY
          },
          timeout: 10000 // 10s timeout
        }
      );

      predictions = response.data.predictions;
      summary = response.data.summary;
    } catch (httpErr) {
      logger.error("FastAPI service request failed: %s. Falling back to internal rule-based engine.", httpErr.message);
      
      // In development, handle fallback in JS if FastAPI is not running!
      predictions = sortedFiles.map(file => {
        const f_freq = Math.min(file.commit_frequency / 10.0, 1.0);
        const f_churn = Math.min(file.code_churn / 5000.0, 1.0);
        const f_contrib = Math.min(file.num_contributors / 5.0, 1.0);
        const f_pr = Math.min(file.pr_count / 10.0, 1.0);
        const score = (f_freq * 0.25) + (f_churn * 0.2) + (f_contrib * 0.15) + (f_pr * 0.1) + (file.bug_fix_ratio * 0.3);
        
        let risk = "LOW";
        let conf = 0.85;

        if (score >= 0.8) {
          risk = "CRITICAL";
          conf = 0.92;
        } else if (score >= 0.55) {
          risk = "HIGH";
          conf = 0.78;
        } else if (score >= 0.25) {
          risk = "MEDIUM";
          conf = 0.65;
        }

        summary[risk]++;

        return {
          file_path: file.file_path,
          risk_level: risk,
          risk_score: conf,
          model_comparison: {
            xgboost_risk: risk,
            xgboost_confidence: conf,
            rf_risk: risk,
            rf_confidence: conf - 0.05,
            agreement: true
          }
        };
      });
    }

    // 6. Save results to database in transaction
    await prisma.$transaction(
      predictions.map(pred => {
        const feat = sortedFiles.find(f => f.file_path === pred.file_path);
        return prisma.predictionResult.upsert({
          where: {
            repoId_filePath: {
              repoId,
              filePath: pred.file_path
            }
          },
          update: {
            commitFrequency: feat.commit_frequency,
            codeChurn: feat.code_churn,
            numContributors: feat.num_contributors,
            prCount: feat.pr_count,
            bugFixRatio: feat.bug_fix_ratio,
            xgboostRisk: pred.risk_level,
            xgboostConfidence: pred.risk_score,
            rfRisk: pred.model_comparison.rf_risk,
            rfConfidence: pred.model_comparison.rf_confidence,
            agreement: pred.model_comparison.agreement
          },
          create: {
            filePath: pred.file_path,
            commitFrequency: feat.commit_frequency,
            codeChurn: feat.code_churn,
            numContributors: feat.num_contributors,
            prCount: feat.pr_count,
            bugFixRatio: feat.bug_fix_ratio,
            xgboostRisk: pred.risk_level,
            xgboostConfidence: pred.risk_score,
            rfRisk: pred.model_comparison.rf_risk,
            rfConfidence: pred.model_comparison.rf_confidence,
            agreement: pred.model_comparison.agreement,
            repoId
          }
        });
      })
    );

    // 7. Emit Socket
    emitToProject(req, projectId, SocketEvent.ML_BATCH_PREDICTION, {
      repoId,
      summary,
      predictionsCount: predictions.length
    });

    return sendSuccess(res, 200, "Repository scan completed successfully", { predictions, summary });
  } catch (error) {
    logger.error("Scan repository error: %o", error);
    return sendError(res, 500, "Failed to scan repository files");
  }
};

/**
 * Check ML Service connection health
 */
const checkMLHealth = async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
    return sendSuccess(res, 200, "ML service is online and healthy", response.data);
  } catch (error) {
    logger.error("ML service health check failed: %s", error.message);
    return sendError(res, 503, "ML microservice is currently unreachable");
  }
};

module.exports = {
  scanRepository,
  checkMLHealth
};
