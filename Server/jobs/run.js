require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { runScheduleCleanup } = require("./scheduleCleanup");
const { runFeeOverdueMarking } = require("./feeOverdue");

const jobs = {
  scheduleCleanup: runScheduleCleanup,
  feeOverdue: runFeeOverdueMarking,
  all: async () => {
    const s = await runScheduleCleanup();
    const f = await runFeeOverdueMarking();
    return { scheduleCleanup: s, feeOverdue: f };
  },
};

async function main() {
  const jobName = process.argv[2];

  if (!jobName || !jobs[jobName]) {
    const available = Object.keys(jobs).join(", ");
    logger.error(
      `Job name required. Usage: node jobs/run.js <${available}>`
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  try {
    logger.info({ job: jobName }, "Connecting to MongoDB for job execution...");
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB.");

    const result = await jobs[jobName]();
    logger.info({ job: jobName, result }, "Job completed successfully.");

    await mongoose.connection.close(false);
    logger.info("MongoDB connection closed. Exiting.");
    process.exit(0);
  } catch (error) {
    logger.error({ job: jobName, error: error.message, stack: error.stack }, "Job execution failed.");
    try {
      await mongoose.connection.close(false);
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  jobs,
};
