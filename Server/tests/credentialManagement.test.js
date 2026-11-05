const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const {
  encryptCredential,
  decryptCredential,
  generateTeacherPassword,
  generateStudentPassword,
} = require("../utils/credentialCrypto");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");

describe("Credential Management & Default Passwords", () => {
  describe("Cryptographic Utilities", () => {
    it("should encrypt and decrypt passwords with AES-256-GCM round-trip", () => {
      const original = "BPT-9482";
      const encrypted = encryptCredential(original);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = decryptCredential(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should return null when decrypting tampered ciphertext", () => {
      const original = "SecretPassword123";
      const encrypted = encryptCredential(original);
      const [iv, authTag, ciphertext] = encrypted.split(":");

      // Tamper with ciphertext
      const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}ff`;
      const result = decryptCredential(tampered);

      expect(result).toBeNull();
    });

    it("should generate teacher passwords matching BPT-XXXX format", () => {
      for (let i = 0; i < 5; i++) {
        const pass = generateTeacherPassword();
        expect(pass).toMatch(/^BPT-\d{4}$/);
      }
    });

    it("should generate student passwords matching BPS-XXXX format", () => {
      for (let i = 0; i < 5; i++) {
        const pass = generateStudentPassword();
        expect(pass).toMatch(/^BPS-\d{4}$/);
      }
    });
  });

  describe("Student Credential Management & Tenant Scoping", () => {
    let fixtures;

    beforeEach(async () => {
      fixtures = await createMultiTenantFixtures();
    });

    it("should return decrypted password when school admin fetches student by ID", async () => {
      // Set an encrypted credential for studentA
      const testPass = "BPS-7712";
      await Student.findByIdAndUpdate(fixtures.studentA._id, {
        password: await bcrypt.hash(testPass, 10),
        encryptedPassword: encryptCredential(testPass),
      });

      const res = await request(app)
        .get(`/api/student/fetch/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student.password).toBe(testPass);
      expect(res.body.student.encryptedPassword).toBeUndefined();
    });

    it("should prevent School B from fetching or viewing School A student password", async () => {
      const res = await request(app)
        .get(`/api/student/fetch/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should allow student to view their own password on /fetch-single", async () => {
      const testPass = "BPS-3104";
      await Student.findByIdAndUpdate(fixtures.studentA._id, {
        password: await bcrypt.hash(testPass, 10),
        encryptedPassword: encryptCredential(testPass),
      });

      const res = await request(app)
        .get("/api/student/fetch-single")
        .set("Authorization", `Bearer ${fixtures.tokens.studentA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student.password).toBe(testPass);
      expect(res.body.student.encryptedPassword).toBeUndefined();
    });

    it("should allow school admin to reset student password and verify login with new password", async () => {
      const newPass = "BPS-9901";

      const updateRes = await request(app)
        .put(`/api/student/reset-password/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
        .send({ password: newPass });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify the updated password is valid for student login
      const loginRes = await request(app)
        .post("/api/student/login")
        .send({
          email: fixtures.studentA.email,
          password: newPass,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);

      // Verify admin can view the newly updated password
      const fetchRes = await request(app)
        .get(`/api/student/fetch/${fixtures.studentA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.student.password).toBe(newPass);
    });

    it("should not leak encryptedPassword or plaintext password in bulk /fetch-with-query", async () => {
      const res = await request(app)
        .get("/api/student/fetch-with-query")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      expect(res.body.students.length).toBeGreaterThan(0);
      for (const s of res.body.students) {
        expect(s.encryptedPassword).toBeUndefined();
        expect(s.password).toBeUndefined();
      }
    });
  });

  describe("Teacher Credential Management & Tenant Scoping", () => {
    let fixtures;

    beforeEach(async () => {
      fixtures = await createMultiTenantFixtures();
    });

    it("should return decrypted password when school admin fetches teacher by ID", async () => {
      const testPass = "BPT-4412";
      await Teacher.findByIdAndUpdate(fixtures.teacherA._id, {
        password: await bcrypt.hash(testPass, 10),
        encryptedPassword: encryptCredential(testPass),
      });

      const res = await request(app)
        .get(`/api/teacher/fetch/${fixtures.teacherA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.teacher.password).toBe(testPass);
      expect(res.body.teacher.encryptedPassword).toBeUndefined();
    });

    it("should prevent School B from fetching or viewing School A teacher password", async () => {
      const res = await request(app)
        .get(`/api/teacher/fetch/${fixtures.teacherA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should allow teacher to view their own password on /fetch-single", async () => {
      const testPass = "BPT-8819";
      await Teacher.findByIdAndUpdate(fixtures.teacherA._id, {
        password: await bcrypt.hash(testPass, 10),
        encryptedPassword: encryptCredential(testPass),
      });

      const res = await request(app)
        .get("/api/teacher/fetch-single")
        .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.teacher.password).toBe(testPass);
      expect(res.body.teacher.encryptedPassword).toBeUndefined();
    });

    it("should allow school admin to reset teacher password and verify login with new password", async () => {
      const newPass = "BPT-6631";

      const updateRes = await request(app)
        .put(`/api/teacher/reset-password/${fixtures.teacherA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
        .send({ password: newPass });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify the updated password is valid for teacher login
      const loginRes = await request(app)
        .post("/api/teacher/login")
        .send({
          email: fixtures.teacherA.email,
          password: newPass,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);

      // Verify admin can view the newly updated password
      const fetchRes = await request(app)
        .get(`/api/teacher/fetch/${fixtures.teacherA._id}`)
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.teacher.password).toBe(newPass);
    });

    it("should not leak encryptedPassword or plaintext password in bulk /fetch-with-query", async () => {
      const res = await request(app)
        .get("/api/teacher/fetch-with-query")
        .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

      expect(res.status).toBe(200);
      expect(res.body.teachers.length).toBeGreaterThan(0);
      for (const t of res.body.teachers) {
        expect(t.encryptedPassword).toBeUndefined();
        expect(t.password).toBeUndefined();
      }
    });
  });
});
