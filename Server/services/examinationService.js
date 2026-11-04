const Examination = require("../models/examinationModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../utils/errors");

const SCHOOL_ONLY_EXAM_TYPES = [
  "Mid Term",
  "Unit Test",
  "Final Term",
  "Annual Exam",
  "Semester Exam",
];
const TEACHER_ALLOWED_EXAM_TYPES = [
  "Quiz",
  "Class Test",
  "Weekly Test",
  "Slip Test",
];

function isExamCompleted(examDate, endTime) {
  const now = new Date();
  const examEndDateTime = new Date(examDate);
  const [hours, minutes] = endTime.split(":").map(Number);
  examEndDateTime.setHours(hours, minutes, 0, 0);
  return now > examEndDateTime;
}

function calculateExamDuration(startTime, endTime) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { error: "Invalid time format. Please use HH:MM format" };
  }

  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);

  if (end <= start) {
    return { error: "End time must be after start time" };
  }

  const diffMs = end - start;
  const durationMinutes = Math.round(diffMs / 60000);

  if (durationMinutes < 15 || durationMinutes > 480) {
    return { error: "Exam duration must be between 15 minutes and 8 hours" };
  }

  return { duration: durationMinutes };
}

class ExaminationService {
  async createExamination({
    role,
    schoolId,
    id,
    date,
    subjectId,
    examType,
    classId,
    startTime,
    endTime,
    duration,
  }) {
    if (
      !date ||
      !subjectId ||
      !examType ||
      !classId ||
      !startTime ||
      !endTime
    ) {
      throw new BadRequestError(
        "All fields are required: date, subjectId, examType, classId, startTime, endTime"
      );
    }

    if (role === "TEACHER" && SCHOOL_ONLY_EXAM_TYPES.includes(examType)) {
      throw new ForbiddenError(
        `Teachers cannot create ${examType} exams. Only Quiz, Class Test, Weekly Test, and Slip Test are allowed.`
      );
    }

    const examDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (examDate < today) {
      throw new BadRequestError("Exam date cannot be in the past");
    }

    const calculatedDuration = calculateExamDuration(startTime, endTime);
    if (calculatedDuration.error) {
      throw new BadRequestError(calculatedDuration.error);
    }

    if (role === "TEACHER") {
      const teacher = await Teacher.findById(id)
        .populate("subjects")
        .populate("teacherClasses");

      if (!teacher) {
        throw new NotFoundError("Teacher not found");
      }

      const hasSubject = teacher.subjects.some(
        (subject) => subject._id.toString() === subjectId
      );
      if (!hasSubject) {
        throw new ForbiddenError(
          "You can only create exams for subjects assigned to you"
        );
      }

      const hasClass = teacher.teacherClasses.some(
        (cls) => cls._id.toString() === classId
      );
      if (!hasClass) {
        throw new ForbiddenError(
          "You can only create exams for classes assigned to you"
        );
      }
    }

    const existingExam = await Examination.findOne({
      school: schoolId,
      class: classId,
      examDate: new Date(date),
      $or: [
        {
          startTime: { $lte: endTime },
          endTime: { $gte: startTime },
        },
      ],
    });

    if (existingExam) {
      throw new BadRequestError(
        "Another exam is already scheduled at this time for this class"
      );
    }

    let createdBy, createdByModel;
    if (role === "SCHOOL") {
      createdBy = schoolId;
      createdByModel = "School";
    } else if (role === "TEACHER") {
      createdBy = id;
      createdByModel = "Teacher";
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
      creatorRole: role,
    });

    await newExamination.save();

    return Examination.findById(newExamination._id)
      .populate("subject", "subjectName")
      .populate("class", "classText")
      .populate("createdBy", "name schoolName");
  }

  async getAllExaminations({ role, schoolId, id }) {
    let query = { school: schoolId };

    if (role === "TEACHER") {
      const teacher = await Teacher.findById(id).populate("teacherClasses");
      if (!teacher) {
        throw new NotFoundError("Teacher not found");
      }
      const teacherClassIds = teacher.teacherClasses.map((cls) => cls._id);
      query = {
        school: schoolId,
        class: { $in: teacherClassIds },
      };
    }

    if (role === "STUDENT") {
      const student = await Student.findById(id);
      if (!student) {
        throw new NotFoundError("Student not found");
      }
      query = {
        school: schoolId,
        class: student.studentClass,
      };
    }

    const allExaminations = await Examination.find(query)
      .populate("subject", "subjectName")
      .populate("class", "classText")
      .populate("createdBy", "name schoolName")
      .sort({ examDate: 1, startTime: 1 });

    return allExaminations.filter(
      (exam) => !isExamCompleted(exam.examDate, exam.endTime)
    );
  }

  async getExaminationByClass({ role, schoolId, id, classId }) {
    if (!classId) {
      throw new BadRequestError("Class ID is required");
    }

    const query = { school: schoolId, class: classId };

    if (role === "STUDENT") {
      const student = await Student.findById(id);
      if (!student) {
        throw new NotFoundError("Student not found");
      }
      if (student.studentClass.toString() !== classId) {
        throw new ForbiddenError("You can only view exams for your class");
      }
    }

    if (role === "TEACHER") {
      const teacher = await Teacher.findById(id).populate("teacherClasses");
      if (!teacher) {
        throw new NotFoundError("Teacher not found");
      }
      const hasClass = teacher.teacherClasses.some(
        (cls) => cls._id.toString() === classId
      );
      if (!hasClass) {
        throw new ForbiddenError(
          "You can only view exams for classes assigned to you"
        );
      }
    }

    const allClassExaminations = await Examination.find(query)
      .populate("subject", "subjectName")
      .populate("class", "classText")
      .populate("createdBy", "name schoolName")
      .sort({ examDate: 1, startTime: 1 });

    return allClassExaminations.filter(
      (exam) => !isExamCompleted(exam.examDate, exam.endTime)
    );
  }

  async updateExamination({ role, schoolId, id, examId, data }) {
    if (!examId) {
      throw new BadRequestError("Examination ID is required");
    }

    const examination = await Examination.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!examination) {
      throw new NotFoundError("Examination not found");
    }

    if (isExamCompleted(examination.examDate, examination.endTime)) {
      throw new BadRequestError("Cannot update a completed examination");
    }

    if (data.subjectId) {
      const subjectDoc = await Subject.findOne({
        _id: data.subjectId,
        school: schoolId,
      });
      if (!subjectDoc) {
        throw new NotFoundError("Subject not found in this school");
      }
    }

    if (role === "TEACHER") {
      if (
        examination.createdBy.toString() !== id ||
        examination.creatorRole !== "TEACHER"
      ) {
        throw new ForbiddenError(
          "You can only edit examinations that you created"
        );
      }

      if (data.examType && SCHOOL_ONLY_EXAM_TYPES.includes(data.examType)) {
        throw new ForbiddenError(
          `Teachers cannot set exam type to ${data.examType}`
        );
      }

      if (data.subjectId) {
        const teacher = await Teacher.findById(id)
          .populate("subjects")
          .populate("teacherClasses");

        if (!teacher) {
          throw new NotFoundError("Teacher not found");
        }

        const currentSubjectId = data.subjectId || examination.subject.toString();
        const currentClassId = examination.class.toString();

        const hasSubject = teacher.subjects.some(
          (subject) => subject._id.toString() === currentSubjectId
        );
        const hasClass = teacher.teacherClasses.some(
          (cls) => cls._id.toString() === currentClassId
        );

        if (!hasSubject) {
          throw new ForbiddenError(
            "You can only update exams for subjects assigned to you"
          );
        }
        if (!hasClass) {
          throw new ForbiddenError(
            "You can only update exams for classes assigned to you"
          );
        }
      }
    }

    if (data.date) {
      const examDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (examDate < today) {
        throw new BadRequestError("Exam date cannot be in the past");
      }
    }

    let calculatedDuration;
    if (data.startTime && data.endTime) {
      calculatedDuration = calculateExamDuration(data.startTime, data.endTime);
      if (calculatedDuration.error) {
        throw new BadRequestError(calculatedDuration.error);
      }
    }

    if (data.date || data.startTime || data.endTime) {
      const conflictQuery = {
        school: schoolId,
        class: examination.class,
        _id: { $ne: examId },
        examDate: new Date(data.date || examination.examDate),
      };

      if (data.startTime && data.endTime) {
        conflictQuery.$or = [
          {
            startTime: { $lte: data.endTime },
            endTime: { $gte: data.startTime },
          },
        ];
      }

      const existingExam = await Examination.findOne(conflictQuery);
      if (existingExam) {
        throw new BadRequestError(
          "Another exam is already scheduled at this time for this class"
        );
      }
    }

    const updateData = {};
    if (data.date) updateData.examDate = new Date(data.date);
    if (data.subjectId) updateData.subject = data.subjectId;
    if (data.examType) updateData.examType = data.examType;
    if (data.startTime) updateData.startTime = data.startTime;
    if (data.endTime) updateData.endTime = data.endTime;
    if (data.duration) updateData.duration = data.duration;
    else if (calculatedDuration)
      updateData.duration = calculatedDuration.duration;

    updateData.updatedAt = new Date();

    return Examination.findOneAndUpdate(
      { _id: examId, school: schoolId },
      { $set: updateData },
      { new: true }
    )
      .populate("subject", "subjectName")
      .populate("class", "classText")
      .populate("createdBy", "name schoolName");
  }

  async deleteExamination({ role, schoolId, id, examId }) {
    if (!examId) {
      throw new BadRequestError("Examination ID is required");
    }

    const examination = await Examination.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!examination) {
      throw new NotFoundError("Examination not found");
    }

    if (isExamCompleted(examination.examDate, examination.endTime)) {
      throw new BadRequestError("Cannot delete a completed examination");
    }

    if (role === "TEACHER") {
      if (
        examination.createdBy.toString() !== id ||
        examination.creatorRole !== "TEACHER"
      ) {
        throw new ForbiddenError(
          "You can only delete examinations that you created"
        );
      }
    }

    await Examination.findOneAndDelete({ _id: examId, school: schoolId });
    return true;
  }

  calculateDuration(startTime, endTime) {
    return calculateExamDuration(startTime, endTime);
  }

  getAvailableExamTypes(role) {
    if (role === "SCHOOL") {
      return [...SCHOOL_ONLY_EXAM_TYPES, ...TEACHER_ALLOWED_EXAM_TYPES];
    }
    if (role === "TEACHER") {
      return TEACHER_ALLOWED_EXAM_TYPES;
    }
    return [];
  }
}

module.exports = new ExaminationService();
