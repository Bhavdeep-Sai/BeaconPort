require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const School = require("../models/schoolModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Schedule = require("../models/scheduleModel");
const Attendance = require("../models/attendanceModel");
const Examination = require("../models/examinationModel");
const Fee = require("../models/feeModel");
const Salary = require("../models/salaryModel");
const Notice = require("../models/noticeModel");

const studentNames = [
  { name: "Aarav Sharma", gender: "Male", parent: "Rajesh Sharma", parentNum: "+91 9876543201", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80" },
  { name: "Ananya Patel", gender: "Female", parent: "Vikram Patel", parentNum: "+91 9876543202", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80" },
  { name: "Rohan Gupta", gender: "Male", parent: "Suresh Gupta", parentNum: "+91 9876543203", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80" },
  { name: "Diya Verma", gender: "Female", parent: "Amit Verma", parentNum: "+91 9876543204", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80" },
  { name: "Ishaan Reddy", gender: "Male", parent: "Prasad Reddy", parentNum: "+91 9876543205", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80" },
  { name: "Meera Nair", gender: "Female", parent: "Gopal Nair", parentNum: "+91 9876543206", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { name: "Arjun Singh", gender: "Male", parent: "Harpreet Singh", parentNum: "+91 9876543207", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80" },
  { name: "Kavya Iyer", gender: "Female", parent: "Raman Iyer", parentNum: "+91 9876543208", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&auto=format&fit=crop&q=80" },
  { name: "Aditya Joshi", gender: "Male", parent: "Manoj Joshi", parentNum: "+91 9876543209", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80" },
  { name: "Pooja Hegde", gender: "Female", parent: "Anand Hegde", parentNum: "+91 9876543210", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80" },
  { name: "Varun Rao", gender: "Male", parent: "Kishore Rao", parentNum: "+91 9876543211", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { name: "Sneha Kulkarni", gender: "Female", parent: "Deepak Kulkarni", parentNum: "+91 9876543212", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" },
  { name: "Kunal Deshmukh", gender: "Male", parent: "Sanjay Deshmukh", parentNum: "+91 9876543213", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80" },
  { name: "Tanvi Saxena", gender: "Female", parent: "Rohit Saxena", parentNum: "+91 9876543214", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80" },
  { name: "Rishi Menon", gender: "Male", parent: "Vinod Menon", parentNum: "+91 9876543215", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80" },
  { name: "Rhea Chawla", gender: "Female", parent: "Ashok Chawla", parentNum: "+91 9876543216", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80" },
  { name: "Pranav Pillai", gender: "Male", parent: "Murugan Pillai", parentNum: "+91 9876543217", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80" },
  { name: "Avni Bhatt", gender: "Female", parent: "Chetan Bhatt", parentNum: "+91 9876543218", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { name: "Siddharth Jain", gender: "Male", parent: "Praveen Jain", parentNum: "+91 9876543219", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80" },
  { name: "Tara Roy", gender: "Female", parent: "Subhash Roy", parentNum: "+91 9876543220", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&auto=format&fit=crop&q=80" },
  { name: "Dhruv Malhotra", gender: "Male", parent: "Vivek Malhotra", parentNum: "+91 9876543221", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80" },
  { name: "Nisha Agarwal", gender: "Female", parent: "Gaurav Agarwal", parentNum: "+91 9876543222", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80" },
  { name: "Yash Nambiar", gender: "Male", parent: "Shankar Nambiar", parentNum: "+91 9876543223", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { name: "Sara Khan", gender: "Female", parent: "Imran Khan", parentNum: "+91 9876543224", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" },
  { name: "Kabir Das", gender: "Male", parent: "Bikash Das", parentNum: "+91 9876543225", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80" },
  { name: "Zoya Ali", gender: "Female", parent: "Tariq Ali", parentNum: "+91 9876543226", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80" },
  { name: "Aryan Bose", gender: "Male", parent: "Debashis Bose", parentNum: "+91 9876543227", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80" },
  { name: "Krisha Sen", gender: "Female", parent: "Arindam Sen", parentNum: "+91 9876543228", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80" },
  { name: "Devansh Mittal", gender: "Male", parent: "Alok Mittal", parentNum: "+91 9876543229", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80" },
  { name: "Anika Choudhury", gender: "Female", parent: "Prabir Choudhury", parentNum: "+91 9876543230", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { name: "Samarjeet Gill", gender: "Male", parent: "Manmohan Gill", parentNum: "+91 9876543231", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80" },
  { name: "Palak Tiwari", gender: "Female", parent: "Mukesh Tiwari", parentNum: "+91 9876543232", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&auto=format&fit=crop&q=80" },
  { name: "Gautam Sethi", gender: "Male", parent: "Satish Sethi", parentNum: "+91 9876543233", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80" },
  { name: "Ira Singhal", gender: "Female", parent: "Rajat Singhal", parentNum: "+91 9876543234", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80" },
  { name: "Harshvardhan Rana", gender: "Male", parent: "Ranveer Rana", parentNum: "+91 9876543235", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { name: "Sanya Kapoor", gender: "Female", parent: "Anil Kapoor", parentNum: "+91 9876543236", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in environment variables");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully!");

  const demoEmail = "demo@beaconport.com";

  // 1. Check and clean up existing demo school & associated records
  let existingSchool = await School.findOne({ email: demoEmail });
  if (existingSchool) {
    console.log("Found existing demo school, cleaning up old records...");
    const schoolId = existingSchool._id;
    await Promise.all([
      Teacher.deleteMany({ school: schoolId }),
      Student.deleteMany({ school: schoolId }),
      Class.deleteMany({ school: schoolId }),
      Subject.deleteMany({ school: schoolId }),
      Schedule.deleteMany({ school: schoolId }),
      Attendance.deleteMany({ school: schoolId }),
      Examination.deleteMany({ school: schoolId }),
      Fee.deleteMany({ school: schoolId }),
      Salary.deleteMany({ school: schoolId }),
      Notice.deleteMany({ school: schoolId }),
      School.deleteOne({ _id: schoolId }),
    ]);
    console.log("Cleaned up previous demo records.");
  }

  // 2. Create Demo School
  console.log("Creating Demo School...");
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  const demoSchool = await School.create({
    schoolName: "BeaconPort Demo Academy",
    email: demoEmail,
    ownerName: "Dr. Alexander Vance",
    schoolImg: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80",
    password: hashedPassword,
    feeFrequency: "half-yearly",
    isOAuthUser: false,
    oauthProvider: null,
  });
  const schoolId = demoSchool._id;
  console.log(`Demo School created with ID: ${schoolId}`);

  // 3. Create 5 Subjects
  console.log("Creating 5 Subjects...");
  const subjectsData = [
    { subjectName: "Mathematics", subjectCode: "MATH101", subjectFee: 1500, school: schoolId },
    { subjectName: "Science & Physics", subjectCode: "SCI101", subjectFee: 1800, school: schoolId },
    { subjectName: "English Literature", subjectCode: "ENG101", subjectFee: 1200, school: schoolId },
    { subjectName: "Computer Science & AI", subjectCode: "CS101", subjectFee: 2000, school: schoolId },
    { subjectName: "Social Studies & History", subjectCode: "SOC101", subjectFee: 1000, school: schoolId },
  ];
  const createdSubjects = await Subject.insertMany(subjectsData);
  const [mathSub, sciSub, engSub, csSub, socSub] = createdSubjects;
  const allSubjectIds = createdSubjects.map((s) => s._id);

  // 4. Create 3 Classes
  console.log("Creating 3 Classes...");
  const classesData = [
    { school: schoolId, classText: "Class 8", classNum: "8A", classFee: 12000, includedSubjects: allSubjectIds },
    { school: schoolId, classText: "Class 9", classNum: "9A", classFee: 15000, includedSubjects: allSubjectIds },
    { school: schoolId, classText: "Class 10", classNum: "10A", classFee: 18000, includedSubjects: allSubjectIds },
  ];
  const createdClasses = await Class.insertMany(classesData);
  const [class8A, class9A, class10A] = createdClasses;
  const allClassIds = createdClasses.map((c) => c._id);

  // 5. Create 5 Teachers
  console.log("Creating 5 Teachers...");
  const teachersData = [
    {
      school: schoolId,
      email: "teacher.math@beaconport.com",
      name: "Sarah Jenkins",
      qualification: "M.Sc. Mathematics, B.Ed",
      subjects: [mathSub._id],
      teacherClasses: allClassIds,
      age: 34,
      gender: "Female",
      teacherImg: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      password: "demo1234",
      salary: 45000,
    },
    {
      school: schoolId,
      email: "teacher.science@beaconport.com",
      name: "David Miller",
      qualification: "Ph.D. Physics",
      subjects: [sciSub._id],
      teacherClasses: allClassIds,
      age: 42,
      gender: "Male",
      teacherImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      password: "demo1234",
      salary: 52000,
    },
    {
      school: schoolId,
      email: "teacher.english@beaconport.com",
      name: "Emily Watson",
      qualification: "M.A. English Literature",
      subjects: [engSub._id],
      teacherClasses: allClassIds,
      age: 29,
      gender: "Female",
      teacherImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80",
      password: "demo1234",
      salary: 40000,
    },
    {
      school: schoolId,
      email: "teacher.cs@beaconport.com",
      name: "Marcus Reynolds",
      qualification: "M.Tech Computer Science",
      subjects: [csSub._id],
      teacherClasses: allClassIds,
      age: 36,
      gender: "Male",
      teacherImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      password: "demo1234",
      salary: 55000,
    },
    {
      school: schoolId,
      email: "teacher.history@beaconport.com",
      name: "Robert Chen",
      qualification: "M.A. History & Civics",
      subjects: [socSub._id],
      teacherClasses: allClassIds,
      age: 45,
      gender: "Male",
      teacherImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
      password: "demo1234",
      salary: 48000,
    },
  ];
  const createdTeachers = await Teacher.insertMany(teachersData);
  const [tMath, tSci, tEng, tCS, tSoc] = createdTeachers;

  // Set Class Attendees (Class Teachers)
  await Class.findByIdAndUpdate(class8A._id, { attendee: tMath._id });
  await Class.findByIdAndUpdate(class9A._id, { attendee: tSci._id });
  await Class.findByIdAndUpdate(class10A._id, { attendee: tCS._id });

  // 6. Create 36 Students (12 in 8A, 12 in 9A, 12 in 10A)
  console.log("Creating 36 Students...");
  const studentsToInsert = [];
  for (let i = 0; i < studentNames.length; i++) {
    const s = studentNames[i];
    const assignedClass = i < 12 ? class8A : i < 24 ? class9A : class10A;
    const studentAge = i < 12 ? 13 + (i % 2) : i < 24 ? 14 + (i % 2) : 15 + (i % 2);

    studentsToInsert.push({
      school: schoolId,
      email: `student${i + 1}@beaconport.com`,
      name: s.name,
      studentClass: assignedClass._id,
      enrolledSubjects: allSubjectIds,
      age: studentAge,
      gender: s.gender,
      parent: s.parent,
      parentNum: s.parentNum,
      studentImg: s.img,
      password: "demo1234",
    });
  }
  const createdStudents = await Student.insertMany(studentsToInsert);
  console.log(`Created ${createdStudents.length} students!`);

  // 7. Seed Attendance for the past 10 working days
  console.log("Seeding Attendance records...");
  const attendanceDocs = [];
  const today = new Date();
  for (let d = 1; d <= 12; d++) {
    const attDate = new Date(today);
    attDate.setDate(today.getDate() - d);
    const dayOfWeek = attDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    attDate.setHours(9, 0, 0, 0);

    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      // 90% chance present
      const isPresent = (i + d) % 9 !== 0;
      attendanceDocs.push({
        school: schoolId,
        student: student._id,
        class: student.studentClass,
        date: attDate,
        status: isPresent ? "Present" : "Absent",
        notes: isPresent ? "Regular attendance" : "Parent notified",
      });
    }
  }
  await Attendance.insertMany(attendanceDocs);
  console.log(`Created ${attendanceDocs.length} attendance records.`);

  // 8. Seed Schedules (Upcoming Timetables for this week)
  console.log("Seeding Schedules...");
  const scheduleDocs = [];
  const schedulePairs = [
    { teacher: tMath, subject: mathSub, startH: 9, endH: 10 },
    { teacher: tSci, subject: sciSub, startH: 10, endH: 11 },
    { teacher: tEng, subject: engSub, startH: 11, endH: 12 },
    { teacher: tCS, subject: csSub, startH: 13, endH: 14 },
    { teacher: tSoc, subject: socSub, startH: 14, endH: 15 },
  ];

  for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() + dayOffset);
    const dow = sDate.getDay();
    if (dow === 0 || dow === 6) continue; // Skip weekends

    for (const cls of createdClasses) {
      for (const sp of schedulePairs) {
        const start = new Date(sDate);
        start.setHours(sp.startH, 0, 0, 0);
        const end = new Date(sDate);
        end.setHours(sp.endH, 0, 0, 0);

        scheduleDocs.push({
          school: schoolId,
          teacher: sp.teacher._id,
          subject: sp.subject._id,
          class: cls._id,
          startTime: start,
          endTime: end,
          status: "active",
        });
      }
    }
  }
  await Schedule.insertMany(scheduleDocs);
  console.log(`Created ${scheduleDocs.length} schedule entries.`);

  // 9. Seed Examinations
  console.log("Seeding Examinations...");
  const examDocs = [];
  const examTypes = ["Mid Term", "Unit Test", "Weekly Test"];
  for (let i = 0; i < createdClasses.length; i++) {
    const cls = createdClasses[i];
    for (let j = 0; j < createdSubjects.length; j++) {
      const sub = createdSubjects[j];
      const examDate = new Date(today);
      examDate.setDate(today.getDate() + 3 + j * 2);
      examDate.setHours(0, 0, 0, 0);

      examDocs.push({
        school: schoolId,
        examDate: examDate,
        subject: sub._id,
        examType: examTypes[j % examTypes.length],
        class: cls._id,
        startTime: "10:00",
        endTime: "12:00",
        duration: 120,
        createdBy: schoolId,
        createdByModel: "School",
        creatorRole: "SCHOOL",
        isActive: true,
      });
    }
  }
  await Examination.insertMany(examDocs);
  console.log(`Created ${examDocs.length} examinations.`);

  // 10. Seed Fees for students (H1 & H2 2026)
  console.log("Seeding Fees...");
  const feeDocs = [];
  const currentYear = 2026;
  for (let i = 0; i < createdStudents.length; i++) {
    const stu = createdStudents[i];
    const isPaid = i % 3 === 0;
    const isPartial = i % 3 === 1;
    const amount = 15000;

    const dueDateH1 = new Date(currentYear, 2, 31);
    const dueDateH2 = new Date(currentYear, 8, 30);

    feeDocs.push({
      school: schoolId,
      student: stu._id,
      class: stu.studentClass,
      amount: amount,
      term: "H1",
      year: currentYear,
      frequency: "half-yearly",
      dueDate: dueDateH1,
      paidDate: new Date(currentYear, 1, 15),
      status: "paid",
      paidAmount: amount,
      paymentMethod: i % 2 === 0 ? "online" : "bank_transfer",
      notes: "Full term fee received",
    });

    feeDocs.push({
      school: schoolId,
      student: stu._id,
      class: stu.studentClass,
      amount: amount,
      term: "H2",
      year: currentYear,
      frequency: "half-yearly",
      dueDate: dueDateH2,
      paidDate: isPaid ? new Date(currentYear, 6, 20) : isPartial ? new Date(currentYear, 7, 5) : null,
      status: isPaid ? "paid" : isPartial ? "partial" : "pending",
      paidAmount: isPaid ? amount : isPartial ? 7500 : null,
      paymentMethod: isPaid ? "online" : isPartial ? "cash" : null,
      notes: isPaid ? "Term 2 cleared" : isPartial ? "Partial payment paid" : "Invoice issued",
    });
  }
  await Fee.insertMany(feeDocs);
  console.log(`Created ${feeDocs.length} fee records.`);

  // 11. Seed Salaries for teachers
  console.log("Seeding Salaries...");
  const salaryDocs = [];
  const months = ["July", "August", "September"];
  for (const t of createdTeachers) {
    for (let m = 0; m < months.length; m++) {
      const monthName = months[m];
      const isPaid = m < 2; // July and August paid, Sept pending
      salaryDocs.push({
        school: schoolId,
        teacher: t._id,
        amount: t.salary,
        month: monthName,
        year: currentYear,
        dueDate: new Date(currentYear, 6 + m, 5),
        paidDate: isPaid ? new Date(currentYear, 6 + m, 4) : null,
        status: isPaid ? "paid" : "pending",
        paymentMethod: isPaid ? "bank_transfer" : null,
        description: `Monthly salary for ${monthName} ${currentYear}`,
      });
    }
  }
  await Salary.insertMany(salaryDocs);
  console.log(`Created ${salaryDocs.length} salary records.`);

  // 12. Seed Notices
  console.log("Seeding Notices...");
  const noticeDocs = [
    {
      school: schoolId,
      title: "🏆 Annual Inter-School Sports Meet 2026",
      message: "We are thrilled to announce that the Annual Sports Meet will be hosted from next month. All students interested in athletics, football, and badminton are requested to submit their names to their class teachers.",
      audience: "All",
      isImportant: true,
      createdBy: "Dr. Alexander Vance",
      creatorRole: "SCHOOL",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      school: schoolId,
      title: "🔬 Science & Robotics Exhibition Registration Open",
      message: "The Science Department is inviting project submissions for the upcoming Innovation Fair. Teams of up to 3 students can register prototype models in IoT, Renewable Energy, or AI.",
      audience: "Student",
      isImportant: true,
      createdBy: "David Miller",
      creatorRole: "TEACHER",
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
    {
      school: schoolId,
      title: "📋 Staff Meeting: Mid-Term Curriculum Review",
      message: "All faculty members are requested to attend the monthly academic review meeting this Friday at 3:30 PM in Conference Hall A. Please have syllabus completion reports ready.",
      audience: "Teacher",
      isImportant: false,
      createdBy: "Dr. Alexander Vance",
      creatorRole: "SCHOOL",
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      school: schoolId,
      title: "🤖 AI Tutor Feature Available in Student Portal",
      message: "Students can now use the built-in 24/7 AI Tutor assistant from their dashboard for step-by-step homework help, doubt clearing, and study tips across all subjects!",
      audience: "Student",
      isImportant: false,
      createdBy: "Dr. Alexander Vance",
      creatorRole: "SCHOOL",
      expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  ];
  await Notice.insertMany(noticeDocs);
  console.log(`Created ${noticeDocs.length} notices.`);

  console.log("\n==========================================");
  console.log(" DEMO DATA SEEDED SUCCESSFULLY! ");
  console.log("==========================================");
  console.log("School Credentials:");
  console.log("  Email: demo@beaconport.com");
  console.log("  Password: demo1234\n");
  console.log("Teacher Credentials (Sample):");
  console.log("  Email: teacher.math@beaconport.com");
  console.log("  Password: demo1234\n");
  console.log("Student Credentials (Sample):");
  console.log("  Email: student1@beaconport.com");
  console.log("  Password: demo1234\n");
  console.log("Total Students: " + createdStudents.length);
  console.log("Total Teachers: " + createdTeachers.length);
  console.log("Total Classes: " + createdClasses.length);
  console.log("Total Subjects: " + createdSubjects.length);
  console.log("==========================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
