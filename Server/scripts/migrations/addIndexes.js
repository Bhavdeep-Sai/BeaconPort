require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../../models/studentModel");
const Teacher = require("../../models/teacherModel");
const Class = require("../../models/classModel");
const Subject = require("../../models/subjectModel");
const Salary = require("../../models/salaryModel");
const Attendance = require("../../models/attendanceModel");
const School = require("../../models/schoolModel");
const Fee = require("../../models/feeModel");

async function checkDuplicates(Model, groupFields, label) {
  const groupId = {};
  groupFields.forEach((field) => {
    groupId[field] = `$${field}`;
  });

  const duplicates = await Model.aggregate([
    {
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        docs: { $push: "$_id" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  if (duplicates.length > 0) {
    console.warn(`[WARNING] Found ${duplicates.length} duplicate group(s) in ${label}:`);
    duplicates.forEach((dup, idx) => {
      console.warn(`  Group #${idx + 1}: ${JSON.stringify(dup._id)} (Count: ${dup.count}, IDs: ${dup.docs.join(", ")})`);
    });
    return false;
  }

  console.log(`[OK] No duplicates found for ${label} on [${groupFields.join(", ")}].`);
  return true;
}

async function runIndexMigration() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/beaconport";
  console.log(`Connecting to MongoDB for index migration...`);

  await mongoose.connect(mongoUri);
  console.log(`Connected successfully. Running duplicate pre-checks...`);

  let clean = true;

  // 1. Check Student { school, email }
  const studentClean = await checkDuplicates(Student, ["school", "email"], "Student");
  if (!studentClean) clean = false;

  // 2. Check Teacher { school, email }
  const teacherClean = await checkDuplicates(Teacher, ["school", "email"], "Teacher");
  if (!teacherClean) clean = false;

  // 3. Check Subject { school, subjectCode }
  const subjectClean = await checkDuplicates(Subject, ["school", "subjectCode"], "Subject");
  if (!subjectClean) clean = false;

  // 4. Check Salary { school, teacher, month, year }
  const salaryClean = await checkDuplicates(Salary, ["school", "teacher", "month", "year"], "Salary");
  if (!salaryClean) clean = false;

  // 5. Check Attendance { school, student, class, dateKey }
  const attendanceClean = await checkDuplicates(Attendance, ["school", "student", "class", "dateKey"], "Attendance");
  if (!attendanceClean) clean = false;

  if (!clean) {
    console.error(`\n[ABORT] Unique index creation halted because duplicate records exist.`);
    console.error(`Resolve the above duplicate entries before re-running the migration.\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nAll duplicate pre-checks passed! Synchronizing and building indexes...`);

  const models = [
    { name: "School", model: School },
    { name: "Student", model: Student },
    { name: "Teacher", model: Teacher },
    { name: "Class", model: Class },
    { name: "Subject", model: Subject },
    { name: "Salary", model: Salary },
    { name: "Attendance", model: Attendance },
    { name: "Fee", model: Fee },
  ];

  for (const item of models) {
    console.log(`Building indexes for ${item.name}...`);
    await item.model.syncIndexes();
    const indexes = await item.model.collection.indexes();
    console.log(`  Current indexes on ${item.name}:`, indexes.map((idx) => idx.name).join(", "));
  }

  console.log(`\n[SUCCESS] All multi-tenant and unique indexes synchronized successfully.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  runIndexMigration().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}

module.exports = { runIndexMigration, checkDuplicates };
