const Examination = require("../models/examinationModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");

// Define exam types that only schools can create
const SCHOOL_ONLY_EXAM_TYPES = ['Mid Term', 'Unit Test','Final Term', 'Annual Exam', 'Semester Exam'];
const TEACHER_ALLOWED_EXAM_TYPES = ['Quiz', 'Class Test', 'Weekly Test', 'Slip Test'];

// Helper function to check if exam is completed
function isExamCompleted(examDate, endTime) {
  const now = new Date();
  const examEndDateTime = new Date(examDate);
  
  // Parse endTime (HH:MM format) and set it on the exam date
  const [hours, minutes] = endTime.split(':').map(Number);
  examEndDateTime.setHours(hours, minutes, 0, 0);
  
  return now > examEndDateTime;
}

module.exports = {
  createExamination: async (req, res) => {
    try {
      const { role, schoolId, id } = req.user;
      const { date, subjectId, examType, classId, startTime, endTime, duration } = req.body;
      
      // Validate required fields
      if (!date || !subjectId || !examType || !classId || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: date, subjectId, examType, classId, startTime, endTime"
        });
      }

      // Validate exam type based on user role
      if (role === 'TEACHER' && SCHOOL_ONLY_EXAM_TYPES.includes(examType)) {
        return res.status(403).json({
          success: false,
          message: `Teachers cannot create ${examType} exams. Only Quiz, Class Test, Weekly Test, and Slip Test are allowed.`
        });
      }

      // Validate exam date is not in the past
      const examDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (examDate < today) {
        return res.status(400).json({
          success: false,
          message: "Exam date cannot be in the past"
        });
      }

      // Validate time format and calculate duration
      const calculatedDuration = calculateExamDuration(startTime, endTime);
      if (calculatedDuration.error) {
        return res.status(400).json({
          success: false,
          message: calculatedDuration.error
        });
      }

      // If teacher, validate they can teach this subject and class
      if (role === 'TEACHER') {
        const teacher = await Teacher.findById(id)
          .populate('subjects')
          .populate('teacherClasses');
        
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found"
          });
        }

        // Check if teacher is assigned to this subject
        const hasSubject = teacher.subjects.some(subject => subject._id.toString() === subjectId);
        if (!hasSubject) {
          return res.status(403).json({
            success: false,
            message: "You can only create exams for subjects assigned to you"
          });
        }

        // Check if teacher is assigned to this class
        const hasClass = teacher.teacherClasses.some(cls => cls._id.toString() === classId);
        if (!hasClass) {
          return res.status(403).json({
            success: false,
            message: "You can only create exams for classes assigned to you"
          });
        }
      }

      // Check for existing exam conflicts
      const existingExam = await Examination.findOne({
        school: schoolId,
        class: classId,
        examDate: new Date(date),
        $or: [
          {
            startTime: { $lte: endTime },
            endTime: { $gte: startTime }
          }
        ]
      });

      if (existingExam) {
        return res.status(400).json({
          success: false,
          message: "Another exam is already scheduled at this time for this class"
        });
      }
      
      // Set creator information based on role
      let createdBy, createdByModel;
      if (role === 'SCHOOL') {
        createdBy = schoolId;
        createdByModel = 'School';
      } else if (role === 'TEACHER') {
        createdBy = id;
        createdByModel = 'Teacher';
      }
      
      const newExamination = new Examination({
        school: schoolId,
        examDate: new Date(date),
        subject: subjectId,
        examType: examType,
        class: classId,
        startTime: startTime,
        endTime: endTime,
        duration: duration || calculatedDuration.duration,
        createdBy: createdBy,
        createdByModel: createdByModel,
        creatorRole: role
      });

      await newExamination.save();
      
      // Populate the saved examination for response
      const populatedExam = await Examination.findById(newExamination._id)
        .populate('subject', 'subjectName')
        .populate('class', 'classText')
        .populate('createdBy', 'name schoolName');

      res.status(201).json({
        success: true,
        message: "Successfully created Exam",
        data: populatedExam,
      });
    } catch (error) {
      console.error("Create examination error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getAllExamination: async (req, res) => {
    try {
      const { role, schoolId, id } = req.user;
      let query = { school: schoolId };
      
      // If teacher, show exams for their assigned classes
      if (role === 'TEACHER') {
        const teacher = await Teacher.findById(id).populate('teacherClasses');
        
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found"
          });
        }
        
        const teacherClassIds = teacher.teacherClasses.map(cls => cls._id);
        
        query = {
          school: schoolId,
          class: { $in: teacherClassIds }
        };
      }
      
      // If student, show only exams for their class
      if (role === 'STUDENT') {
        const student = await Student.findById(id);
        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student not found"
          });
        }
        
        query = {
          school: schoolId,
          class: student.studentClass
        };
      }
      
      const allExaminations = await Examination.find(query)
        .populate('subject', 'subjectName')
        .populate('class', 'classText')
        .populate('createdBy', 'name schoolName')
        .sort({ examDate: 1, startTime: 1 });

      // Filter out completed exams
      const activeExaminations = allExaminations.filter(exam => 
        !isExamCompleted(exam.examDate, exam.endTime)
      );

      res.status(200).json({ 
        success: true, 
        data: activeExaminations,
        count: activeExaminations.length
      });
    } catch (error) {
      console.error("Get all examinations error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getExaminationByClass: async (req, res) => {
    try {
      const { role, schoolId, id } = req.user;
      const classId = req.params.id;
      
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: "Class ID is required"
        });
      }

      let query = { school: schoolId, class: classId };
      
      // Additional validation for students - they can only see exams for their own class
      if (role === 'STUDENT') {
        const student = await Student.findById(id);
        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student not found"
          });
        }
        
        if (student.studentClass.toString() !== classId) {
          return res.status(403).json({
            success: false,
            message: "You can only view exams for your class"
          });
        }
      }
      
      // Additional validation for teachers - they can only see exams for their assigned classes
      if (role === 'TEACHER') {
        const teacher = await Teacher.findById(id).populate('teacherClasses');
        
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found"
          });
        }
        
        const hasClass = teacher.teacherClasses.some(cls => cls._id.toString() === classId);
        
        if (!hasClass) {
          return res.status(403).json({
            success: false,
            message: "You can only view exams for classes assigned to you"
          });
        }
      }
      
      const allClassExaminations = await Examination.find(query)
        .populate('subject', 'subjectName')
        .populate('class', 'classText')
        .populate('createdBy', 'name schoolName')
        .sort({ examDate: 1, startTime: 1 });

      // Filter out completed exams
      const activeClassExaminations = allClassExaminations.filter(exam => 
        !isExamCompleted(exam.examDate, exam.endTime)
      );
        
      res.status(200).json({ 
        success: true, 
        data: activeClassExaminations,
        count: activeClassExaminations.length
      });
    } catch (error) {
      console.error("Get examinations by class error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  updateExaminationWithId: async (req, res) => {
    try {
      const { role, schoolId, id } = req.user;
      const examId = req.params.id;
      const { date, subjectId, examType, startTime, endTime, duration } = req.body;

      if (!examId) {
        return res.status(400).json({
          success: false,
          message: "Examination ID is required"
        });
      }

      // Find the examination first to check permissions
      const examination = await Examination.findOne({ 
        _id: examId, 
        school: schoolId 
      });

      if (!examination) {
        return res.status(404).json({
          success: false,
          message: "Examination not found"
        });
      }

      // Check if exam is already completed
      if (isExamCompleted(examination.examDate, examination.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Cannot update a completed examination"
        });
      }

      // Check permissions - Fixed the permission logic
      if (role === 'TEACHER') {
        // Teachers can only edit exams they created
        if (examination.createdBy.toString() !== id || examination.creatorRole !== 'TEACHER') {
          return res.status(403).json({
            success: false,
            message: "You can only edit examinations that you created"
          });
        }
        
        // Teachers cannot change exam type to school-only types
        if (examType && SCHOOL_ONLY_EXAM_TYPES.includes(examType)) {
          return res.status(403).json({
            success: false,
            message: `Teachers cannot set exam type to ${examType}`
          });
        }

        // Validate teacher can still teach this subject and class
        if (subjectId) {
          const teacher = await Teacher.findById(id)
            .populate('subjects')
            .populate('teacherClasses');
          
          if (!teacher) {
            return res.status(404).json({
              success: false,
              message: "Teacher not found"
            });
          }
          
          const currentSubjectId = subjectId || examination.subject.toString();
          const currentClassId = examination.class.toString();

          const hasSubject = teacher.subjects.some(subject => subject._id.toString() === currentSubjectId);
          const hasClass = teacher.teacherClasses.some(cls => cls._id.toString() === currentClassId);

          if (!hasSubject) {
            return res.status(403).json({
              success: false,
              message: "You can only update exams for subjects assigned to you"
            });
          }

          if (!hasClass) {
            return res.status(403).json({
              success: false,
              message: "You can only update exams for classes assigned to you"
            });
          }
        }
      }

      // Validate exam date if provided
      if (date) {
        const examDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (examDate < today) {
          return res.status(400).json({
            success: false,
            message: "Exam date cannot be in the past"
          });
        }
      }

      // Validate time and calculate duration if time fields are provided
      let calculatedDuration;
      if (startTime && endTime) {
        calculatedDuration = calculateExamDuration(startTime, endTime);
        if (calculatedDuration.error) {
          return res.status(400).json({
            success: false,
            message: calculatedDuration.error
          });
        }
      }

      // Check for conflicts if date or time is being changed
      if (date || startTime || endTime) {
        const conflictQuery = {
          school: schoolId,
          class: examination.class,
          _id: { $ne: examId },
          examDate: new Date(date || examination.examDate)
        };

        if (startTime && endTime) {
          conflictQuery.$or = [{
            startTime: { $lte: endTime },
            endTime: { $gte: startTime }
          }];
        }

        const existingExam = await Examination.findOne(conflictQuery);
        if (existingExam) {
          return res.status(400).json({
            success: false,
            message: "Another exam is already scheduled at this time for this class"
          });
        }
      }

      const updateData = {};
      if (date) updateData.examDate = new Date(date);
      if (subjectId) updateData.subject = subjectId;
      if (examType) updateData.examType = examType;
      if (startTime) updateData.startTime = startTime;
      if (endTime) updateData.endTime = endTime;
      if (duration) updateData.duration = duration;
      else if (calculatedDuration) updateData.duration = calculatedDuration.duration;
      
      updateData.updatedAt = new Date();

      const updatedExam = await Examination.findByIdAndUpdate(
        examId, 
        { $set: updateData },
        { new: true }
      ).populate('subject', 'subjectName')
       .populate('class', 'classText')
       .populate('createdBy', 'name schoolName');

      res.status(200).json({ 
        success: true, 
        message: "Examination details updated successfully",
        data: updatedExam
      });
    } catch (error) {
      console.error("Update examination error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  deleteExaminationWithId: async (req, res) => {
    try {
      const { role, schoolId, id } = req.user;
      const examId = req.params.id;
      
      if (!examId) {
        return res.status(400).json({
          success: false,
          message: "Examination ID is required"
        });
      }

      // Find the examination first to check permissions
      const examination = await Examination.findOne({ 
        _id: examId, 
        school: schoolId 
      });

      if (!examination) {
        return res.status(404).json({
          success: false,
          message: "Examination not found"
        });
      }

      // Check if exam is already completed
      if (isExamCompleted(examination.examDate, examination.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete a completed examination"
        });
      }

      // Check permissions
      if (role === 'TEACHER') {
        // Teachers can only delete exams they created
        if (examination.createdBy.toString() !== id || examination.creatorRole !== 'TEACHER') {
          return res.status(403).json({
            success: false,
            message: "You can only delete examinations that you created"
          });
        }
      }

      await Examination.findByIdAndDelete(examId);
      
      res.status(200).json({
        success: true, 
        message: "Examination deleted successfully"
      });
    } catch (error) {
      console.error("Delete examination error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  calculateDuration: async (req, res) => {
    try {
      const { startTime, endTime } = req.body;
      
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Both start time and end time are required"
        });
      }
      
      const result = calculateExamDuration(startTime, endTime);
      
      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }
      
      res.status(200).json({ 
        success: true, 
        data: { duration: result.duration }
      });
    } catch (error) {
      console.error("Calculate duration error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get available exam types based on user role
  getAvailableExamTypes: async (req, res) => {
    try {
      const { role } = req.user;
      
      let availableTypes;
      if (role === 'SCHOOL') {
        availableTypes = [...SCHOOL_ONLY_EXAM_TYPES, ...TEACHER_ALLOWED_EXAM_TYPES];
      } else if (role === 'TEACHER') {
        availableTypes = TEACHER_ALLOWED_EXAM_TYPES;
      } else {
        availableTypes = [];
      }
      
      res.status(200).json({
        success: true,
        data: availableTypes
      });
    } catch (error) {
      console.error("Get exam types error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Helper function to calculate exam duration
function calculateExamDuration(startTime, endTime) {
  try {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { error: "Invalid time format. Please use HH:MM format" };
    }

    // Parse the times and calculate duration in minutes
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    
    // Check if end time is after start time
    if (end <= start) {
      return { error: "End time must be after start time" };
    }
    
    // Calculate the difference in milliseconds
    const diffMs = end - start;
    
    // Convert to minutes
    const durationMinutes = Math.round(diffMs / 60000);
    
    // Validate reasonable duration (between 15 minutes and 8 hours)
    if (durationMinutes < 15 || durationMinutes > 480) {
      return { error: "Exam duration must be between 15 minutes and 8 hours" };
    }
    
    return { duration: durationMinutes };
  } catch (error) {
    return { error: "Error calculating duration" };
  }
}