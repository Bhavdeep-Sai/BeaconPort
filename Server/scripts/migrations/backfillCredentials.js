require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Teacher = require("../../models/teacherModel");
const Student = require("../../models/studentModel");
const {
  encryptCredential,
  generateTeacherPassword,
  generateStudentPassword,
} = require("../../utils/credentialCrypto");

async function backfill() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in environment variables.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB for credential backfill...");
  await mongoose.connect(mongoUri);
  console.log("Connected successfully.");

  // 1. Backfill Teachers lacking encryptedPassword
  const teachers = await Teacher.find({
    $or: [
      { encryptedPassword: { $exists: false } },
      { encryptedPassword: null },
      { encryptedPassword: "" },
    ],
  });

  console.log(`Found ${teachers.length} teachers requiring credential backfill.`);
  let teachersUpdated = 0;
  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    const defaultPassword = generateTeacherPassword();
    teacher.password = await bcrypt.hash(defaultPassword, 10);
    teacher.encryptedPassword = encryptCredential(defaultPassword);
    await teacher.save();
    teachersUpdated++;
  }

  // 2. Backfill Students lacking encryptedPassword
  const students = await Student.find({
    $or: [
      { encryptedPassword: { $exists: false } },
      { encryptedPassword: null },
      { encryptedPassword: "" },
    ],
  });

  console.log(`Found ${students.length} students requiring credential backfill.`);
  let studentsUpdated = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const defaultPassword = generateStudentPassword();
    student.password = await bcrypt.hash(defaultPassword, 10);
    student.encryptedPassword = encryptCredential(defaultPassword);
    await student.save();
    studentsUpdated++;
  }

  console.log(`Successfully backfilled ${teachersUpdated} teachers and ${studentsUpdated} students!`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

if (require.main === module) {
  backfill().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}

module.exports = backfill;

