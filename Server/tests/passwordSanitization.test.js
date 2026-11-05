const request = require("supertest");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");

function assertNoPasswordKey(obj, path = "") {
  if (!obj || typeof obj !== "object") return;
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (key.toLowerCase() === "password") {
      throw new Error(`Forbidden password field leaked at path: ${currentPath}`);
    }
    if (typeof value === "object" && value !== null) {
      assertNoPasswordKey(value, currentPath);
    }
  }
}

describe("2.3 Password Sanitization & Leakage Prevention", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  it("should not return password in teacher fetch-with-query response", async () => {
    const res = await request(app)
      .get("/api/teacher/fetch-with-query")
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

    expect(res.status).toBe(200);
    expect(res.body.teachers.length).toBeGreaterThan(0);
    assertNoPasswordKey(res.body);
  });

  it("should not return password in teacher fetch by ID response", async () => {
    const res = await request(app)
      .get(`/api/teacher/fetch/${fixtures.teacherA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

    expect(res.status).toBe(200);
    expect(res.body.teacher).toBeDefined();
    assertNoPasswordKey(res.body);
  });

  it("should not return password in teacher own-data response", async () => {
    const res = await request(app)
      .get("/api/teacher/fetch-single")
      .set("Authorization", `Bearer ${fixtures.tokens.teacherA}`);

    expect(res.status).toBe(200);
    expect(res.body.teacher).toBeDefined();
    assertNoPasswordKey(res.body);
  });

  it("should not return password in student fetch-with-query response", async () => {
    const res = await request(app)
      .get("/api/student/fetch-with-query")
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

    expect(res.status).toBe(200);
    expect(res.body.students.length).toBeGreaterThan(0);
    assertNoPasswordKey(res.body);
  });

  it("should not return password in student fetch by ID response", async () => {
    const res = await request(app)
      .get(`/api/student/fetch/${fixtures.studentA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
    assertNoPasswordKey(res.body);
  });

  it("should not return password in student own-data response", async () => {
    const res = await request(app)
      .get("/api/student/fetch-single")
      .set("Authorization", `Bearer ${fixtures.tokens.studentA}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
    assertNoPasswordKey(res.body);
  });

  it("should not return password or sensitive fields in public school list", async () => {
    const res = await request(app).get("/api/school/all");

    expect(res.status).toBe(200);
    expect(res.body.schools.length).toBeGreaterThan(0);
    assertNoPasswordKey(res.body);

    // Verify only public fields (_id, schoolName, schoolImg) are exposed
    for (const school of res.body.schools) {
      expect(school).toHaveProperty("_id");
      expect(school).toHaveProperty("schoolName");
      expect(school).toHaveProperty("schoolImg");
      expect(school.email).toBeUndefined();
      expect(school.ownerName).toBeUndefined();
      expect(school.password).toBeUndefined();
    }
  });

  it("should not return password in school login response", async () => {
    const res = await request(app)
      .post("/api/school/login")
      .send({ email: "admin@oakridge.edu", password: "Password123!" });

    expect(res.status).toBe(200);
    assertNoPasswordKey(res.body);
  });

  it("should not return password in teacher login response", async () => {
    const res = await request(app)
      .post("/api/teacher/login")
      .send({ email: "teacher.a@oakridge.edu", password: "Password123!" });

    expect(res.status).toBe(200);
    assertNoPasswordKey(res.body);
  });

  it("should not return password in student login response", async () => {
    const res = await request(app)
      .post("/api/student/login")
      .send({ email: "student.a@oakridge.edu", password: "Password123!" });

    expect(res.status).toBe(200);
    assertNoPasswordKey(res.body);
  });
});
