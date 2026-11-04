const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const { getTenantFilter } = require("../utils/tenant");
const { validateEnv } = require("../config/env");
const { runScheduleCleanup } = require("../jobs/scheduleCleanup");
const { runFeeOverdueMarking } = require("../jobs/feeOverdue");
const Schedule = require("../models/scheduleModel");
const Fee = require("../models/feeModel");
const Notice = require("../models/noticeModel");

describe("Phase 4: Architecture, Observability & Reliability", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  describe("4.3 Health & Readiness Probes", () => {
    it("should return 200 with status ok and uptime on GET /health", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(typeof res.body.uptime).toBe("number");
      expect(res.body.timestamp).toBeDefined();
    });

    it("should return 200 with database connected on GET /ready", async () => {
      const res = await request(app).get("/ready");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.database).toBe("connected");
    });
  });

  describe("4.3 Structured Logging & Request IDs", () => {
    it("should generate and return an x-request-id header on every request", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-request-id"]).toBeDefined();
      expect(res.headers["x-request-id"].length).toBeGreaterThan(0);
    });

    it("should preserve and echo client-supplied x-request-id", async () => {
      const customId = "trace-client-uuid-99999";
      const res = await request(app)
        .get("/health")
        .set("x-request-id", customId);

      expect(res.headers["x-request-id"]).toBe(customId);
    });
  });

  describe("4.3 Startup Environment Validation", () => {
    it("should successfully validate an environment with valid configuration", () => {
      const validEnv = {
        NODE_ENV: "test",
        PORT: "5000",
        MONGO_URI: "mongodb://localhost:27017/testdb",
        JWT_SECRET: "strong_secret_key_at_least_32_characters_long",
      };

      const result = validateEnv(validEnv);
      expect(result.NODE_ENV).toBe("test");
      expect(result.PORT).toBe("5000");
    });

    it("should throw an error if MONGO_URI is missing", () => {
      const invalidEnv = {
        NODE_ENV: "development",
        PORT: "5000",
        MONGO_URI: "",
        JWT_SECRET: "strong_secret_key_at_least_32_characters_long",
      };

      expect(() => validateEnv(invalidEnv)).toThrow(/Environment validation failed/);
    });

    it("should throw an error if JWT_SECRET is too short (< 8 chars)", () => {
      const invalidEnv = {
        NODE_ENV: "development",
        PORT: "5000",
        MONGO_URI: "mongodb://localhost:27017/testdb",
        JWT_SECRET: "short",
      };

      expect(() => validateEnv(invalidEnv)).toThrow(/JWT_SECRET must be at least 8 characters/);
    });
  });

  describe("4.2 Central Tenant Scoping Helper", () => {
    it("should inject school filter when tenant context exists", () => {
      const req = {
        user: { schoolId: fixtures.schoolA._id.toString() },
      };

      const filter = getTenantFilter(req, { status: "active" });
      expect(filter.school).toBe(fixtures.schoolA._id.toString());
      expect(filter.status).toBe("active");
    });

    it("should throw UnauthorizedError when tenant context is missing", () => {
      const req = { user: {} };

      expect(() => getTenantFilter(req)).toThrow(/Tenant context required/);
    });
  });

  describe("4.3 Request Validation with Zod", () => {
    it("should reject school login with malformed email (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/school/login")
        .send({ email: "not-an-email", password: "somePassword" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid.*email|validation failed/i);
      expect(res.body.errors).toBeDefined();
    });

    it("should reject notice creation with invalid audience (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/notice/create")
        .set("Authorization", fixtures.tokens.schoolA)
        .send({
          title: "Exam Notice",
          message: "Please prepare for upcoming tests",
          audience: "InvalidAudience",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it("should reject exam creation with invalid time format (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/examination/create")
        .set("Authorization", fixtures.tokens.schoolA)
        .send({
          date: "2026-12-01",
          subjectId: fixtures.subjectA._id.toString(),
          examType: "Quiz",
          classId: fixtures.classA._id.toString(),
          startTime: "9am", // Invalid HH:MM
          endTime: "10am",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("4.4 Decoupled Background Jobs & No Write-on-Read", () => {
    it("should execute schedule cleanup job and mark expired active schedules as completed", async () => {
      // Create past active schedule
      const pastSchedule = await Schedule.create({
        school: fixtures.schoolA._id,
        teacher: fixtures.teacherA._id,
        subject: fixtures.subjectA._id,
        class: fixtures.classA._id,
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(Date.now() - 3600000), // 1 hour ago
        status: "active",
      });

      const summary = await runScheduleCleanup();
      expect(summary.markedCompleted).toBeGreaterThanOrEqual(1);

      const updated = await Schedule.findById(pastSchedule._id);
      expect(updated.status).toBe("completed");
    });

    it("should execute fee overdue marking job and update pending fees past due date", async () => {
      // Create past pending fee
      const pastFee = await Fee.create({
        school: fixtures.schoolA._id,
        student: fixtures.studentA._id,
        class: fixtures.classA._id,
        frequency: "half-yearly",
        term: "Q1",
        year: 2026,
        amount: 500,
        paidAmount: 0,
        status: "pending",
        dueDate: new Date(Date.now() - 86400000), // yesterday
      });

      const summary = await runFeeOverdueMarking();
      expect(summary.markedOverdue).toBeGreaterThanOrEqual(1);

      const updated = await Fee.findById(pastFee._id);
      expect(updated.status).toBe("overdue");
    });

    it("should verify GET /fee/overview does NOT perform write-on-read updates", async () => {
      // Create a pending fee past due date
      const pastFee = await Fee.create({
        school: fixtures.schoolA._id,
        student: fixtures.studentA._id,
        class: fixtures.classA._id,
        frequency: "half-yearly",
        term: "H2",
        year: 2026,
        amount: 800,
        paidAmount: 0,
        status: "pending",
        dueDate: new Date(Date.now() - 86400000), // yesterday
      });

      // Call GET /overview with term and year
      const res = await request(app)
        .get("/api/fee/overview?term=H2&year=2026")
        .set("Authorization", fixtures.tokens.schoolA);

      expect(res.status).toBe(200);

      // Verify the fee status remains 'pending' (no side-effect write on read!)
      const feeAfterRead = await Fee.findById(pastFee._id);
      expect(feeAfterRead.status).toBe("pending");
    });
  });

  describe("4.1 Service Layer & Backward-Compatible Responses", () => {
    it("should create, list, and delete notices through the service layer", async () => {
      // Create notice
      const createRes = await request(app)
        .post("/api/notice/create")
        .set("Authorization", fixtures.tokens.schoolA)
        .send({
          title: "Sports Day",
          message: "Annual sports day next Friday",
          audience: "All",
          isImportant: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.title).toBe("Sports Day");
      const noticeId = createRes.body.data._id;

      // List notices
      const listRes = await request(app)
        .get("/api/notice/all")
        .set("Authorization", fixtures.tokens.schoolA);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.pagination).toBeDefined();

      // Delete notice
      const deleteRes = await request(app)
        .delete(`/api/notice/${noticeId}`)
        .set("Authorization", fixtures.tokens.schoolA);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });
});
