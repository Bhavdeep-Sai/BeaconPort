const Attendance = require("../models/attendanceModel");
const Student = require("../models/studentModel");
const Class = require("../models/classModel");
const moment = require("moment");
const mongoose = require("mongoose");

module.exports = {
  markAttendance: async (req, res) => {
    try {
      const { studentId, date, status, classId, notes } = req.body;
      const schoolId = req.user.schoolId;

      // Validate required fields
      if (!studentId || !date || !status || !classId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }

      // Validate studentId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID format"
        });
      }

      // Validate classId
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID format"
        });
      }

      // Ensure class belongs to this school
      const targetClass = await Class.findOne({ _id: classId, school: schoolId });
      if (!targetClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found in this school"
        });
      }

      // Ensure student belongs to this school
      const targetStudent = await Student.findOne({ _id: studentId, school: schoolId });
      if (!targetStudent) {
        return res.status(404).json({
          success: false,
          message: "Student not found in this school"
        });
      }

      // Ensure status is valid
      if (!['Present', 'Absent'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'Present' or 'Absent'"
        });
      }

      // Ensure date is properly formatted
      const formattedDate = moment(date, "YYYY-MM-DD", true);
      if (!formattedDate.isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const dateKey = formattedDate.format("YYYY-MM-DD");

      // Check if attendance already exists for this specific student on this dateKey
      const existingAttendance = await Attendance.findOne({
        student: studentId,
        dateKey: dateKey,
        class: classId,
        school: schoolId
      });

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          message: "Attendance has already been marked for this student today",
          data: existingAttendance
        });
      }

      // Create new attendance record
      const newAttendance = new Attendance({
        student: studentId,
        date: formattedDate.toDate(),
        dateKey,
        status,
        notes: notes || '',
        class: classId,
        school: schoolId,
      });

      await newAttendance.save();
      
      res.status(201).json({ 
        success: true, 
        message: "Attendance marked successfully",
        data: newAttendance 
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error" 
      });
    }
  },

  // New method for bulk attendance submission
  markBulkAttendance: async (req, res) => {
    try {
      const { attendanceData, classId, date } = req.body;
      const schoolId = req.user.schoolId;

      // Validate required fields
      if (!attendanceData || !Array.isArray(attendanceData) || !classId || !date) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      // Validate classId
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID format"
        });
      }

      // Ensure class belongs to this school
      const targetClass = await Class.findOne({ _id: classId, school: schoolId });
      if (!targetClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found in this school"
        });
      }

      // Ensure all students belong to this school
      const inputStudentIds = attendanceData.map(r => r.studentId).filter(id => mongoose.Types.ObjectId.isValid(id));
      const studentCount = await Student.countDocuments({
        _id: { $in: inputStudentIds },
        school: schoolId
      });
      if (studentCount !== attendanceData.length) {
        return res.status(400).json({
          success: false,
          message: "One or more students do not belong to this school"
        });
      }

      // Ensure date is properly formatted
      const formattedDate = moment(date, "YYYY-MM-DD", true);
      if (!formattedDate.isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const dateKey = formattedDate.format("YYYY-MM-DD");

      // Check if attendance has already been taken for this class today using dateKey
      const existingAttendance = await Attendance.findOne({
        class: classId,
        school: schoolId,
        dateKey: dateKey
      });

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          message: "Attendance has already been taken for this class today"
        });
      }

      // Validate all student IDs and attendance data
      const bulkOps = [];
      for (const record of attendanceData) {
        if (!record.studentId || !mongoose.Types.ObjectId.isValid(record.studentId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid student ID in attendance data"
          });
        }

        if (!['Present', 'Absent'].includes(record.status)) {
          return res.status(400).json({
            success: false,
            message: "Status must be either 'Present' or 'Absent'"
          });
        }

        bulkOps.push({
          insertOne: {
            document: {
              student: record.studentId,
              date: formattedDate.toDate(),
              dateKey: dateKey,
              status: record.status,
              notes: record.notes || '',
              class: classId,
              school: schoolId
            }
          }
        });
      }

      // Insert all attendance records atomically via bulkWrite
      try {
        const bulkResult = await Attendance.bulkWrite(bulkOps, { ordered: false });

        res.status(201).json({
          success: true,
          message: `Attendance marked successfully for ${bulkResult.insertedCount} students`,
          insertedCount: bulkResult.insertedCount,
          dateKey: dateKey
        });
      } catch (bulkErr) {
        if (bulkErr.code === 11000 || bulkErr.name === "MongoBulkWriteError") {
          return res.status(409).json({
            success: false,
            message: "Attendance has already been taken for one or more students today"
          });
        }
        throw bulkErr;
      }

    } catch (error) {
      console.error("Error marking bulk attendance:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  },

  getAttendance: async (req, res) => {
    try {
      const studentId = req.params.id;
      const schoolId = req.user.schoolId;

      // Validate studentId
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Valid student ID is required" 
        });
      }

      // Check role isolation: Students may only view their own attendance
      if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot view another student's attendance"
        });
      }

      // Get student info scoped to tenant school
      const student = await Student.findOne({ _id: studentId, school: schoolId })
        .populate('studentClass');

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get attendance records scoped to tenant school
      const attendance = await Attendance.find({ student: studentId, school: schoolId })
        .populate({
          path: 'class',
          select: 'classText section'
        })
        .sort({ date: -1 });

      console.log(`Found ${attendance.length} attendance records for ${student.name}`);

      res.status(200).json({ 
        success: true, 
        attendance,
        student
      });
    } catch (error) {
      console.error("Error getting attendance:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error" 
      });
    }
  },

  // Get bulk attendance for multiple students
  getBulkAttendance: async (req, res) => {
    try {
      const { studentIds } = req.body;
      const { startDate, endDate } = req.query;
      
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Valid student IDs array is required"
        });
      }

      // Validate all student IDs
      const validIds = studentIds.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!validIds) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid student IDs"
        });
      }

      // Prepare date filter if provided
      let dateFilter = {};
      if (startDate && endDate) {
        const startDateObj = moment(startDate, "YYYY-MM-DD", true);
        const endDateObj = moment(endDate, "YYYY-MM-DD", true);
        
        if (!startDateObj.isValid() || !endDateObj.isValid()) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format. Use YYYY-MM-DD"
          });
        }

        dateFilter = {
          date: {
            $gte: startDateObj.startOf('day').toDate(),
            $lte: endDateObj.endOf('day').toDate()
          }
        };
      }

      // Validate students belong to this school
      const schoolId = req.user.schoolId;
      const studentCount = await Student.countDocuments({
        _id: { $in: studentIds },
        school: schoolId
      });
      if (studentCount !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more students do not belong to this school"
        });
      }

      // Get attendance for all students scoped to tenant school
      const attendanceRecords = await Attendance.find({
        student: { $in: studentIds },
        school: schoolId,
        ...dateFilter
      })
      .populate('student', 'name studentClass')
      .populate('class', 'classText section')
      .sort({ date: -1 });

      // Group by student for easier frontend processing
      const groupedAttendance = {};
      attendanceRecords.forEach(record => {
        const studentId = record.student._id.toString();
        if (!groupedAttendance[studentId]) {
          groupedAttendance[studentId] = {
            student: record.student,
            attendance: []
          };
        }
        groupedAttendance[studentId].attendance.push(record);
      });

      res.status(200).json({
        success: true,
        data: groupedAttendance
      });
    } catch (error) {
      console.error("Error getting bulk attendance:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  },

  checkAttendance: async (req, res) => {
    try {
      const classId = req.params.classId;
      const schoolId = req.user.schoolId;

      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Valid class ID is required" 
        });
      }

      const targetClass = await Class.findOne({ _id: classId, school: schoolId });
      if (!targetClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found in this school"
        });
      }

      const dateKey = req.query.date && moment(req.query.date, "YYYY-MM-DD", true).isValid()
        ? moment(req.query.date, "YYYY-MM-DD").format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD");

      const attendanceForToday = await Attendance.findOne({
        class: classId,
        school: schoolId,
        dateKey: dateKey,
      });

      return res.status(200).json({ 
        success: true, 
        attendanceTaken: Boolean(attendanceForToday),
        dateKey: dateKey,
        message: attendanceForToday 
          ? "Attendance has already been taken for today" 
          : "Attendance has not been taken yet for today",
      });
    } catch (error) {
      console.error("Error checking attendance:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },
};