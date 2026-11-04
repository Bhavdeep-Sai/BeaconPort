const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const School = require("../../models/schoolModel");
const Teacher = require("../../models/teacherModel");
const Student = require("../../models/studentModel");
const Class = require("../../models/classModel");
const Subject = require("../../models/subjectModel");

async function createMultiTenantFixtures() {
  const JWT_SECRET = process.env.JWT_SECRET || "test_super_secret_jwt_key_min_32_characters";
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // --- SCHOOL A ---
  const schoolA = await School.create({
    schoolName: "Oakridge Academy",
    email: "admin@oakridge.edu",
    ownerName: "Principal Oak",
    schoolImg: "https://res.cloudinary.com/demo/image/upload/oakridge.png",
    password: hashedPassword,
  });

  const classA = await Class.create({
    school: schoolA._id,
    classText: "Class 10A",
    classNum: "10A",
    classFee: 1500,
  });

  const subjectA = await Subject.create({
    school: schoolA._id,
    subjectName: "Physics",
    subjectCode: "PHY101",
    subjectFee: 200,
  });

  const teacherA = await Teacher.create({
    school: schoolA._id,
    email: "teacher.a@oakridge.edu",
    name: "Dr. Alice",
    qualification: "Ph.D. Physics",
    age: 38,
    gender: "Female",
    teacherImg: "https://res.cloudinary.com/demo/image/upload/alice.png",
    password: hashedPassword,
    subjects: [subjectA._id],
    teacherClasses: [classA._id],
    salary: 5000,
  });

  const studentA = await Student.create({
    school: schoolA._id,
    email: "student.a@oakridge.edu",
    name: "Alex Doe",
    studentClass: classA._id,
    age: 15,
    gender: "Male",
    parent: "John Doe",
    parentNum: "1234567890",
    studentImg: "https://res.cloudinary.com/demo/image/upload/alex.png",
    password: hashedPassword,
    enrolledSubjects: [subjectA._id],
  });

  const studentA2 = await Student.create({
    school: schoolA._id,
    email: "student.a2@oakridge.edu",
    name: "Aaron Doe",
    studentClass: classA._id,
    age: 15,
    gender: "Male",
    parent: "Jane Doe",
    parentNum: "1234567891",
    studentImg: "https://res.cloudinary.com/demo/image/upload/aaron.png",
    password: hashedPassword,
    enrolledSubjects: [subjectA._id],
  });

  // --- SCHOOL B (Different Tenant) ---
  const schoolB = await School.create({
    schoolName: "Pinecrest High",
    email: "admin@pinecrest.edu",
    ownerName: "Principal Pine",
    schoolImg: "https://res.cloudinary.com/demo/image/upload/pinecrest.png",
    password: hashedPassword,
  });

  const classB = await Class.create({
    school: schoolB._id,
    classText: "Class 10B",
    classNum: "10B",
    classFee: 1800,
  });

  const subjectB = await Subject.create({
    school: schoolB._id,
    subjectName: "Chemistry",
    subjectCode: "CHE101",
    subjectFee: 250,
  });

  const teacherB = await Teacher.create({
    school: schoolB._id,
    email: "teacher.b@pinecrest.edu",
    name: "Mr. Bob",
    qualification: "M.Sc. Chemistry",
    age: 42,
    gender: "Male",
    teacherImg: "https://res.cloudinary.com/demo/image/upload/bob.png",
    password: hashedPassword,
    subjects: [subjectB._id],
    teacherClasses: [classB._id],
    salary: 5200,
  });

  const studentB = await Student.create({
    school: schoolB._id,
    email: "student.b@pinecrest.edu",
    name: "Bella Smith",
    studentClass: classB._id,
    age: 15,
    gender: "Female",
    parent: "Mary Smith",
    parentNum: "0987654321",
    studentImg: "https://res.cloudinary.com/demo/image/upload/bella.png",
    password: hashedPassword,
    enrolledSubjects: [subjectB._id],
  });

  // Tokens
  const schoolAToken = jwt.sign(
    { id: schoolA._id, schoolId: schoolA._id, role: "SCHOOL", schoolName: schoolA.schoolName },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const teacherAToken = jwt.sign(
    { id: teacherA._id, schoolId: schoolA._id, role: "TEACHER", name: teacherA.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const studentAToken = jwt.sign(
    { id: studentA._id, schoolId: schoolA._id, role: "STUDENT", name: studentA.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const studentA2Token = jwt.sign(
    { id: studentA2._id, schoolId: schoolA._id, role: "STUDENT", name: studentA2.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const schoolBToken = jwt.sign(
    { id: schoolB._id, schoolId: schoolB._id, role: "SCHOOL", schoolName: schoolB.schoolName },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const teacherBToken = jwt.sign(
    { id: teacherB._id, schoolId: schoolB._id, role: "TEACHER", name: teacherB.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const studentBToken = jwt.sign(
    { id: studentB._id, schoolId: schoolB._id, role: "STUDENT", name: studentB.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return {
    schoolA, classA, subjectA, teacherA, studentA, studentA2,
    schoolB, classB, subjectB, teacherB, studentB,
    tokens: {
      schoolA: schoolAToken,
      teacherA: teacherAToken,
      studentA: studentAToken,
      studentA2: studentA2Token,
      schoolB: schoolBToken,
      teacherB: teacherBToken,
      studentB: studentBToken,
    },
  };
}

module.exports = { createMultiTenantFixtures };

