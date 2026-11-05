require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const loggingMiddleware = require("./middleware/loggingMiddleware");
const errorHandler = require("./middleware/errorHandler");
const { attachTenantContext } = require("./utils/tenant");

const healthRouter = require("./routes/healthRouter");
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

// 4.3 Structured Logging with Pino-HTTP & Request Tracing
app.use(loggingMiddleware);

// 4.3 Health & Readiness Probes (/health and /ready)
app.use(healthRouter);

// 2.6 Abuse protection: Helmet security headers
app.use(helmet());

// 2.6 Abuse protection: JSON body size limit (10kb)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// 4.2 Attach Tenant Scoping Context
app.use(attachTenantContext);

// 2.6 Abuse protection: Strict CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin) or allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"));
    },
    credentials: true,
  })
);

// 2.6 Abuse protection: Rate limiters
const isTest = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000,
  max: isTest ? 5 : 20, // 5 attempts in tests to trigger 429 easily
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

const aiLimiter = rateLimit({
  windowMs: isTest ? 1000 : 60 * 1000,
  max: isTest ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI service is currently busy. Rate limit exceeded.",
  },
});

// Apply rate limiting to sensitive auth and AI endpoints
app.post("/api/school/login", authLimiter);
app.post("/api/school/register", authLimiter);
app.post("/api/school/forgot-password", authLimiter);
app.post("/api/teacher/login", authLimiter);
app.post("/api/student/login", authLimiter);
app.use("/api/ai-tutor/chat", aiLimiter);

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

// 4.3 Central error handling middleware
app.use(errorHandler);

module.exports = app;
