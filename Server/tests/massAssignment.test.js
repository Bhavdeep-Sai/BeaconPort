const request = require("supertest");
const app = require("../app");
const { createMultiTenantFixtures } = require("./helpers/testData");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");

describe("2.5 Mass Assignment Protection", () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await createMultiTenantFixtures();
  });

  it("should ignore unauthorized fields (school, role) when updating a class", async () => {
    const maliciousSchoolId = fixtures.schoolB._id.toString();

    const res = await request(app)
      .put(`/api/class/update/${fixtures.classA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
      .send({
        classText: "Updated Class 10A",
        school: maliciousSchoolId,
        role: "SUPERADMIN",
      });

    expect(res.status).toBe(200);
    const updated = await Class.findById(fixtures.classA._id);
    expect(updated.classText).toBe("Updated Class 10A");
    expect(updated.school.toString()).toBe(fixtures.schoolA._id.toString());
  });

  it("should ignore unauthorized fields (school) when updating a subject", async () => {
    const maliciousSchoolId = fixtures.schoolB._id.toString();

    const res = await request(app)
      .put(`/api/subject/update/${fixtures.subjectA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
      .send({
        subjectName: "Advanced Physics",
        school: maliciousSchoolId,
      });

    expect(res.status).toBe(200);
    const updated = await Subject.findById(fixtures.subjectA._id);
    expect(updated.subjectName).toBe("Advanced Physics");
    expect(updated.school.toString()).toBe(fixtures.schoolA._id.toString());
  });

  it("should not allow overwriting password, school, or role via teacher update", async () => {
    const maliciousSchoolId = fixtures.schoolB._id.toString();
    const originalTeacher = await Teacher.findById(fixtures.teacherA._id).select("+password");
    const originalPassword = originalTeacher.password;

    const res = await request(app)
      .put(`/api/teacher/update/${fixtures.teacherA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
      .field("name", "Dr. Alice Updated")
      .field("school", maliciousSchoolId)
      .field("role", "SUPERADMIN")
      .field("password", "injected_plain_password");

    expect(res.status).toBe(200);
    const updated = await Teacher.findById(fixtures.teacherA._id).select("+password");
    expect(updated.name).toBe("Dr. Alice Updated");
    expect(updated.school.toString()).toBe(fixtures.schoolA._id.toString());
    expect(updated.password).toBe(originalPassword);
  });

  it("should not allow overwriting password, school, or role via student update", async () => {
    const maliciousSchoolId = fixtures.schoolB._id.toString();
    const originalStudent = await Student.findById(fixtures.studentA._id).select("+password");
    const originalPassword = originalStudent.password;

    const res = await request(app)
      .put(`/api/student/update/${fixtures.studentA._id}`)
      .set("Authorization", `Bearer ${fixtures.tokens.schoolA}`)
      .field("name", "Alex Doe Updated")
      .field("school", maliciousSchoolId)
      .field("role", "SUPERADMIN")
      .field("password", "injected_plain_password");

    expect(res.status).toBe(200);
    const updated = await Student.findById(fixtures.studentA._id).select("+password");
    expect(updated.name).toBe("Alex Doe Updated");
    expect(updated.school.toString()).toBe(fixtures.schoolA._id.toString());
    expect(updated.password).toBe(originalPassword);
  });
});

