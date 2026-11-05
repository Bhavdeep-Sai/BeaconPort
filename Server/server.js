require("dotenv").config();
const mongoose = require("mongoose");
const cron = require("node-cron");
const { env } = require("./config/env");
const logger = require("./utils/logger");
const app = require("./app");
const { runScheduleCleanup } = require("./jobs/scheduleCleanup");
const { runFeeOverdueMarking } = require("./jobs/feeOverdue");

// MongoDB connection
mongoose
  .connect(env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected successfully");
    if (env.ENABLE_IN_PROCESS_CRON) {
      logger.info("In-process cron enabled (ENABLE_IN_PROCESS_CRON=true). Starting scheduled jobs...");
      setupInProcessCronJobs();
    } else {
      logger.info("In-process cron disabled. Background jobs will be triggered externally via CLI (jobs/run.js).");
    }
  })
  .catch((err) => {
    logger.error({ err }, "MongoDB connection error");
    process.exit(1);
  });

function setupInProcessCronJobs() {
  // 1. Schedule cleanup job (every day at midnight UTC)
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await runScheduleCleanup();
      } catch (error) {
        logger.error({ error }, "Error running in-process schedule cleanup job");
      }
    },
    { scheduled: true, timezone: "UTC" }
  );

  // 2. Fee overdue marking job (every day at 01:00 UTC)
  cron.schedule(
    "0 1 * * *",
    async () => {
      try {
        await runFeeOverdueMarking();
      } catch (error) {
        logger.error({ error }, "Error running in-process fee overdue job");
      }
    },
    { scheduled: true, timezone: "UTC" }
  );
}

const PORT = env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: env.NODE_ENV }, `Server is running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info({ signal }, "Received shutdown signal. Closing HTTP server...");
  server.close(async () => {
    logger.info("HTTP server closed. Disconnecting MongoDB...");
    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed cleanly. Process exit.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error closing MongoDB connection.");
      process.exit(1);
    }
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = server;
