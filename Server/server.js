require("dotenv").config();
const mongoose = require("mongoose");
const cron = require("node-cron");
const app = require("./app");
const Schedule = require("./models/scheduleModel");

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    setupScheduleCleanupJob();
  })
  .catch((err) => {
    console.log("Connection error", err);
  });

// Schedule cleanup job
function setupScheduleCleanupJob() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log("Running schedule cleanup job...");
        const now = new Date();

        const updateResult = await Schedule.updateMany(
          {
            status: "active",
            endTime: { $lt: now },
          },
          {
            $set: { status: "completed" },
          }
        );

        console.log(
          `Marked ${updateResult.modifiedCount} schedules as completed`
        );

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deleteResult = await Schedule.deleteMany({
          status: "completed",
          endTime: { $lt: thirtyDaysAgo },
        });

        console.log(
          `Deleted ${deleteResult.deletedCount} old completed schedules`
        );
      } catch (error) {
        console.error("Error in schedule cleanup job:", error);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Images are now stored on Cloudinary cloud storage");
});
