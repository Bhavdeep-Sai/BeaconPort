const Fee = require("../models/feeModel");
const logger = require("../utils/logger");

/**
 * Mark pending fees past their due date as 'overdue'.
 */
async function runFeeOverdueMarking() {
  const now = new Date();
  logger.info("Starting fee overdue marking job...");

  const result = await Fee.updateMany(
    {
      status: "pending",
      dueDate: { $lt: now },
    },
    {
      $set: { status: "overdue" },
    }
  );

  const summary = {
    markedOverdue: result.modifiedCount || 0,
  };

  logger.info(summary, "Fee overdue marking job completed successfully.");
  return summary;
}

module.exports = {
  runFeeOverdueMarking,
};
