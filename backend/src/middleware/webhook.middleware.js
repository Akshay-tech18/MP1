const crypto = require("crypto");
const prisma = require("../config/db");
const { sendError } = require("../utils/response.utils");
const logger = require("../utils/logger");

/**
 * Middleware to verify incoming GitHub webhooks using HMAC-SHA256
 */
const verifyGitHubWebhook = async (req, res, next) => {
  const signatureHeader = req.headers["x-hub-signature-256"];

  if (!signatureHeader) {
    logger.warn("GitHub Webhook signature header x-hub-signature-256 missing");
    return sendError(res, 401, "Webhook signature missing");
  }

  // Ensure req.body is a buffer (from express.raw)
  if (!Buffer.isBuffer(req.body)) {
    logger.error("Request body is not a raw buffer. Ensure express.raw is applied.");
    return sendError(res, 500, "Invalid internal body parsing");
  }

  try {
    // Parse JSON payload from buffer
    const rawBodyStr = req.body.toString("utf8");
    const payload = JSON.parse(rawBodyStr);
    
    if (!payload.repository || !payload.repository.id) {
      logger.warn("Webhook payload does not contain repository.id");
      return sendError(res, 400, "Invalid payload content");
    }

    const githubRepoId = payload.repository.id;

    // Look up repository and get its unique webhook secret
    const repo = await prisma.repository.findUnique({
      where: { githubRepoId },
      select: { webhookSecret: true, id: true, projectId: true }
    });

    if (!repo) {
      logger.warn(`Repository with GitHub ID ${githubRepoId} not linked in system`);
      return sendError(res, 404, "Repository not linked");
    }

    // Compute signature
    const hmac = crypto.createHmac("sha256", repo.webhookSecret);
    const computedSignature = "sha256=" + hmac.update(req.body).digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const hasEqualLength = signatureHeader.length === computedSignature.length;
    const isMatched = hasEqualLength && crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "utf8"),
      Buffer.from(computedSignature, "utf8")
    );

    if (!isMatched) {
      logger.warn(`HMAC signature verification failed for repo ID: ${githubRepoId}`);
      return sendError(res, 401, "Invalid webhook signature");
    }

    // Save parsed payload and repository details to request for downstream handlers
    req.gitHubPayload = payload;
    req.linkedRepo = repo;
    
    // Replace req.body with parsed JSON so controllers can read it directly
    req.body = payload;

    next();
  } catch (error) {
    logger.error("GitHub webhook verification error: %o", error);
    return sendError(res, 400, "Error parsing webhook request");
  }
};

module.exports = {
  verifyGitHubWebhook
};
