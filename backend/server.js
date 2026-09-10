// Load Environment Variables first
require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initSocketServer } = require("./src/config/socket");
const logger = require("./src/utils/logger");

// 1. Create HTTP Server
const server = http.createServer(app);

// 2. Initialize Socket.IO Server
const io = initSocketServer(server);

// 3. Attach Socket Server Instance to Express app
app.set("io", io);

// 4. Start Server
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";

server.listen(PORT, () => {
  logger.info(`=== DevPilot Backend Server ===`);
  logger.info(`Server successfully started in [${NODE_ENV}] mode`);
  logger.info(`Listening on port: ${PORT}`);
  logger.info(`REST Endpoints base: http://localhost:${PORT}/api`);
  logger.info(`Websocket Endpoint: ws://localhost:${PORT}/project`);
  logger.info(`===============================`);
});

const prisma = require("./src/config/db");

// Handle server shutdown events
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down server gracefully...");
  
  if (io) {
    io.close(() => logger.info("Socket.IO server closed."));
  }

  server.close(async () => {
    logger.info("HTTP server closed.");
    await prisma.$disconnect();
    logger.info("Database connection closed.");
    process.exit(0);
  });
});
