require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const path = require("path");
const Schedule = require("./models/scheduleModel");

const schoolRouter = require("./routes/schoolRouter");
const classRouter = require("./routes/classRouter");
const subjectRouter = require("./routes/subjectRouter");
const studentRouter = require("./routes/studentRouter");
const teacherRouter = require("./routes/teacherRouter");
const scheduleRouter = require("./routes/scheduleRouter");
const attendanceRouter = require("./routes/attendanceRouter");
const examinationRouter = require("./routes/examinationRouter");
const noticeRouter = require("./routes/noticeRouter");
const aiTutorRoutes = require("./routes/aiTutorRoutes");
const feeRouter = require("./routes/feeRouter");
const salaryRouter = require("./routes/salaryRouter");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(cookieParser());

// Note: Since we're using Cloudinary, we no longer need local uploads directory
// However, keeping this for backward compatibility or other file types
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");

// Create uploads directory for any temporary files if needed
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Routes
app.use("/api/school", schoolRouter);
app.use("/api/class", classRouter);
app.use("/api/subject", subjectRouter);
app.use("/api/student", studentRouter);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/teacher", teacherRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/examination", examinationRouter);
app.use("/api/notice", noticeRouter);
app.use("/api/fee", feeRouter);
app.use("/api/salary", salaryRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Images are now stored on Cloudinary cloud storage");
});
