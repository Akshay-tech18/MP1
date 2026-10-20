const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("./src/config/passport");
const prisma = require("./src/config/db");
const { errorHandler } = require("./src/middleware/error.middleware");
const { sendSuccess, sendError } = require("./src/utils/response.utils");
const logger = require("./src/utils/logger");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();

// Enable trust proxy for Dokku / Nginx reverse proxy (for secure HTTPS cookies)
app.set("trust proxy", 1);

// 0. Inject Correlation ID and Access Logging
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  logger.info(`[${req.id}] ${req.method} ${req.originalUrl}`);
  next();
});

// 1. Enable Helmet for Secure HTTP Headers (disabling CSP to allow SPA bundle & external assets)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// 2. Configure CORS
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-ML-Service-Key"]
  })
);

// 4. GitHub Routes
const { webhookRouter, repositoryRouter, userGithubRouter } = require("./src/modules/github/github.routes");
app.use("/api/webhooks", webhookRouter); // MUST BE MOUNTED BEFORE express.json()
app.use("/api/github", userGithubRouter);

// 5. Global Request Parsers (Applied to all routes other than webhooks)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// 6. Initialize Passport Auth Strategies
app.use(passport.initialize());

// 7. Health Check Endpoints
app.get("/health", (req, res) => {
  return sendSuccess(res, 200, "Server is online and healthy");
});

app.get("/health/db", async (req, res) => {
  try {
    // Run simple query to check DB availability
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, 200, "Database connection is healthy");
  } catch (err) {
    logger.error("DB Health Check Failed: %o", err);
    return sendError(res, 503, "Database service is currently unreachable");
  }
});

// 8. Import Routers
const authRouter = require("./src/modules/auth/auth.routes");
const userRouter = require("./src/modules/users/user.routes");
const projectRouter = require("./src/modules/projects/project.routes");
const sprintRouter = require("./src/modules/sprints/sprint.routes");
const taskRouter = require("./src/modules/tasks/task.routes");
const analyticsRouter = require("./src/modules/analytics/analytics.routes");
const mlRouter = require("./src/modules/ml/ml.routes");
const messageRouter = require("./src/modules/communication/message.routes");
const documentRouter = require("./src/modules/documents/document.routes");
const nexusRouter = require("./src/modules/nexus/nexus.routes");
const timesheetRouter = require("./src/modules/timesheets/timesheet.routes");

// --- API Routes ---
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/projects", projectRouter);

// Nested project routes
projectRouter.use("/:id/sprints", sprintRouter);
projectRouter.use("/:id/tasks", taskRouter);
projectRouter.use("/:id/repositories", repositoryRouter);
projectRouter.use("/:id/analytics", analyticsRouter);
projectRouter.use("/:id/ml", mlRouter);
projectRouter.use("/:id/messages", messageRouter);
projectRouter.use("/:id/timesheets", timesheetRouter);
projectRouter.use("/:projectId/documents", documentRouter);
projectRouter.use("/:projectId/nexus", nexusRouter);

// 9. Static Frontend SPA Serving (Single-Domain Unified Deployment)
const publicPath = fs.existsSync(path.join(__dirname, "public"))
  ? path.join(__dirname, "public")
  : path.join(process.cwd(), "public");

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));

  // Explicit root route
  app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  // SPA fallback for HTML5 History API: serve index.html for all non-API GET requests
  app.get("*", (req, res, next) => {
    if (
      req.originalUrl.startsWith("/api") ||
      req.originalUrl.startsWith("/health") ||
      req.originalUrl.startsWith("/project")
    ) {
      return next();
    }
    const indexPath = path.join(publicPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// 10. Route Not Found (404) Handler
app.use((req, res) => {
  return sendError(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
});

// 11. Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
