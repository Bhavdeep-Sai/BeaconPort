const request = require("supertest");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const Examination = require("../models/examinationModel");
const Schedule = require("../models/scheduleModel");
const Attendance = require("../models/attendanceModel");

describe("2.2 Multi-Tenant Isolation & Cross-Tenant Access Protection", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  describe("Attendance Isolation", () => {
    it("should prevent School B from viewing School A student attendance", async () => {
      const res = await request(app)
        .get(`/api/attendance/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should prevent a student from viewing another student's attendance", async () => {
      const res = await request(app)
        .get(`/api/attendance/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.studentA2}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow a student to view their own attendance", async () => {
      const res = await request(app)
        .get(`/api/attendance/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.studentA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student).toBeDefined();
    });

    it("should prevent School B from checking attendance for School A's class", async () => {
      const res = await request(app)
        .get(`/api/attendance/check/${fixtures.classA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should prevent Teacher B from marking attendance for School A's student and class", async () => {
      const res = await request(app)
        .post("/api/attendance/mark")
        .set("Authorization", `Bearer ${fixtures.tokens.teacherB}`)
        .send({
          studentId: fixtures.studentA._id,
          classId: fixtures.classA._id,
          date: "2026-11-04",
          status: "Present",
        });

      expect([400, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Examination Isolation", () => {
    let examA;

    beforeEach(async () => {
      examA = await Examination.create({
        school: fixtures.schoolA._id,
        examDate: new Date(Date.now() + 86400000), // tomorrow
        subject: fixtures.subjectA._id,
        class: fixtures.classA._id,
        examType: "Quiz",
        startTime: "10:00",
        endTime: "11:00",
        duration: 60,
        createdBy: fixtures.teacherA._id,
        createdByModel: "Teacher",
        creatorRole: "TEACHER",
      });
    });

    it("should prevent School B from updating School A's examination", async () => {
      const res = await request(app)
        .put(`/api/examination/update/${examA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`)
        .send({
          startTime: "11:00",
          endTime: "12:00",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should prevent School B from deleting School A's examination", async () => {
      const res = await request(app)
        .delete(`/api/examination/delete/${examA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Schedule Isolation", () => {
    let scheduleA;

    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      scheduleA = await Schedule.create({
        school: fixtures.schoolA._id,
        class: fixtures.classA._id,
        subject: fixtures.subjectA._id,
        teacher: fixtures.teacherA._id,
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 3600000),
        status: "active",
      });
    });

    it("should prevent School B from updating School A's schedule", async () => {
      const res = await request(app)
        .put(`/api/schedule/update/${scheduleA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`)
        .send({
          status: "cancelled",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Subject Isolation", () => {
    it("should prevent School B from updating School A's subject", async () => {
      const res = await request(app)
        .put(`/api/subject/update/${fixtures.subjectA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`)
        .send({
          subjectName: "Hacked Physics",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Class Subject Cross-Linking Protection", () => {
    it("should prevent School B from linking School A's subject into its own class", async () => {
      const res = await request(app)
        .put(`/api/class/update/${fixtures.classB._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`)
        .send({
          includedSubjects: [fixtures.subjectA._id],
        });

      expect([400, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });
});
