const Schedule = require("../models/scheduleModel");
const logger = require("../utils/logger");

/**
 * Cleanup expired schedules:
 * 1. Mark active schedules with past endTime as 'completed'.
 * 2. Purge completed schedules older than 30 days.
 */
async function runScheduleCleanup() {
  const now = new Date();
  logger.info("Starting schedule cleanup job...");

  const updateResult = await Schedule.updateMany(
    {
      status: "active",
      endTime: { $lt: now },
    },
    {
      $set: { status: "completed" },
    }
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const deleteResult = await Schedule.deleteMany({
    status: "completed",
    endTime: { $lt: thirtyDaysAgo },
  });

  const summary = {
    markedCompleted: updateResult.modifiedCount || 0,
    deletedOld: deleteResult.deletedCount || 0,
  };

  logger.info(summary, "Schedule cleanup job completed successfully.");
  return summary;
}

module.exports = {
  runScheduleCleanup,
};
