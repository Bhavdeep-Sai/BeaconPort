const request = require("supertest");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const School = require("../models/schoolModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Salary = require("../models/salaryModel");
const Attendance = require("../models/attendanceModel");
const Fee = require("../models/feeModel");

describe("Phase 3: Database Design, Schema Integrity & Query Performance", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  describe("3.1 Schema Fixes & Dynamic Timestamps", () => {
    it("should use dynamic timestamps and not a fixed boot time", async () => {
      const class1 = await Class.create({
        school: fixtures.schoolA._id,
        classText: "Class 1A",
        classNum: "1A",
      });

      // Assert createdAt exists and is a valid Date
      expect(class1.createdAt).toBeDefined();
      expect(class1.createdAt instanceof Date).toBe(true);

      // Assert the typo 'createAt' does not exist as an official field
      expect(class1.createAt).toBeUndefined();
    });

    it("should correctly populate school reference from Teacher model", async () => {
      const populatedTeacher = await Teacher.findById(fixtures.teacherA._id).populate("school");
      expect(populatedTeacher.school).toBeDefined();
      expect(populatedTeacher.school.schoolName).toBe("Oakridge Academy");
    });
  });

  describe("3.2 Compound Indexes & Tenant-Scoped Uniqueness", () => {
    it("should prevent duplicate student emails within the same school", async () => {
      await expect(
        Student.create({
          school: fixtures.schoolA._id,
          email: "student.a@oakridge.edu", // duplicate in School A
          name: "Another Alex",
          studentClass: fixtures.classA._id,
          age: 16,
          gender: "Male",
          parent: "John Doe",
          parentNum: "1234567890",
          studentImg: "https://example.com/img.png",
          password: "Password123!",
        })
      ).rejects.toThrow(/E11000/);
    });

    it("should allow the same student email in DIFFERENT schools", async () => {
      const studentInSchoolB = await Student.create({
        school: fixtures.schoolB._id,
        email: "student.a@oakridge.edu", // same email, but School B
        name: "Alex in School B",
        studentClass: fixtures.classB._id,
        age: 16,
        gender: "Male",
        parent: "John Doe",
        parentNum: "1234567890",
        studentImg: "https://example.com/img.png",
        password: "Password123!",
      });

      expect(studentInSchoolB).toBeDefined();
      expect(studentInSchoolB.school.toString()).toBe(fixtures.schoolB._id.toString());
    });

    it("should prevent duplicate teacher emails within the same school", async () => {
      await expect(
        Teacher.create({
          school: fixtures.schoolA._id,
          email: "teacher.a@oakridge.edu", // duplicate in School A
          name: "Duplicate Alice",
          qualification: "M.Sc.",
          age: 35,
          gender: "Female",
          teacherImg: "https://example.com/alice2.png",
          password: "Password123!",
        })
      ).rejects.toThrow(/E11000/);
    });

    it("should prevent duplicate salary records for the same teacher in the same month and year", async () => {
      await Salary.create({
        school: fixtures.schoolA._id,
        teacher: fixtures.teacherA._id,
        amount: 5000,
        month: "January",
        year: 2026,
        dueDate: new Date("2026-01-31"),
        status: "pending",
      });

      // Second attempt with exact same teacher, month, year in same school
      await expect(
        Salary.create({
          school: fixtures.schoolA._id,
          teacher: fixtures.teacherA._id,
          amount: 5000,
          month: "January",
          year: 2026,
          dueDate: new Date("2026-01-31"),
          status: "pending",
        })
      ).rejects.toThrow(/E11000/);
    });
  });

  describe("3.3 Attendance Overhaul (dateKey, Aggregation, Atomic bulkWrite)", () => {
    it("should store dateKey in YYYY-MM-DD format and check attendance accurately", async () => {
      const res = await request(app)
        .post("/api/attendance/mark")
        .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`)
        .send({
          studentId: fixtures.studentA._id,
          classId: fixtures.classA._id,
          date: "2026-11-04",
          status: "Present",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dateKey).toBe("2026-11-04");

      // Verify check attendance finds it by dateKey
      const checkRes = await request(app)
        .get(`/api/attendance/check/${fixtures.classA._id}?date=2026-11-04`)
        .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.attendanceTaken).toBe(true);
    });

    it("should return 409 Conflict when bulk marking already-recorded attendance", async () => {
      const payload = {
        classId: fixtures.classA._id,
        date: "2026-11-04",
        attendanceData: [
          { studentId: fixtures.studentA._id, status: "Present" },
          { studentId: fixtures.studentA2._id, status: "Absent" },
        ],
      };

      // First submission
      const firstRes = await request(app)
        .post("/api/attendance/mark-bulk")
        .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`)
        .send(payload);

      expect(firstRes.status).toBe(201);

      // Second submission for the same class and date
      const secondRes = await request(app)
        .post("/api/attendance/mark-bulk")
        .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`)
        .send(payload);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.message).toMatch(/already.*taken/i);
    });
  });

  describe("3.4 Backward-Compatible Pagination", () => {
    it("should return pagination metadata while preserving students array", async () => {
      const res = await request(app)
        .get("/api/student/fetch-with-query?page=1&limit=1")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.students)).toBe(true);
      expect(res.body.students.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2); // studentA and studentA2
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.totalPages).toBe(2);
      expect(res.body.pagination.hasNextPage).toBe(true);
      expect(res.body.pagination.hasPrevPage).toBe(false);
    });

    it("should return lean objects without password field", async () => {
      const res = await request(app)
        .get("/api/student/fetch-with-query")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      for (const student of res.body.students) {
        expect(student.password).toBeUndefined();
      }
    });
  });

  describe("3.5 Idempotent Batched Bulk Fee Generation", () => {
    it("should idempotently generate fees using bulkWrite without duplicate key errors", async () => {
      const feePayload = {
        term: "H1",
        year: 2026,
        dueDate: "2026-12-31",
        frequency: "half-yearly",
        classId: fixtures.classA._id,
      };

      // Initial generation
      const firstRes = await request(app)
        .post("/api/fee/bulk-generate")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
        .send(feePayload);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.created).toBe(2); // studentA and studentA2

      // Second consecutive run with identical parameters
      const secondRes = await request(app)
        .post("/api/fee/bulk-generate")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
        .send(feePayload);

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.created).toBe(0); // 0 newly created, skipped/matched existing
      expect(secondRes.body.skipped).toBe(2);

      // Verify in DB that exactly 2 fees exist total
      const count = await Fee.countDocuments({
        school: fixtures.schoolA._id,
        term: "H1",
        year: 2026,
      });
      expect(count).toBe(2);
    });

    it("should handle concurrent bulk fee requests safely without duplicates", async () => {
      const feePayload = {
        term: "H2",
        year: 2026,
        dueDate: "2026-12-31",
        frequency: "half-yearly",
        classId: fixtures.classA._id,
      };

      // Fire 2 concurrent bulk-generate requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post("/api/fee/bulk-generate")
          .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
          .send(feePayload),
        request(app)
          .post("/api/fee/bulk-generate")
          .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
          .send(feePayload),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Exactly 2 total fee documents should exist in database
      const totalFees = await Fee.countDocuments({
        school: fixtures.schoolA._id,
        term: "H2",
        year: 2026,
      });
      expect(totalFees).toBe(2);
    });
  });
});
