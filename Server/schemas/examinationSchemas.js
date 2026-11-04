const { z } = require("zod");

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const createExaminationSchema = z.object({
  date: z.string().min(1, "Date is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  examType: z.string().min(1, "Exam type is required"),
  classId: z.string().min(1, "Class ID is required"),
  startTime: z.string().regex(timeRegex, "Invalid startTime format (HH:MM required)"),
  endTime: z.string().regex(timeRegex, "Invalid endTime format (HH:MM required)"),
  duration: z.union([z.number(), z.string()]).optional(),
});

const updateExaminationSchema = z.object({
  date: z.string().optional(),
  subjectId: z.string().optional(),
  examType: z.string().optional(),
  startTime: z.string().regex(timeRegex, "Invalid startTime format (HH:MM required)").optional(),
  endTime: z.string().regex(timeRegex, "Invalid endTime format (HH:MM required)").optional(),
  duration: z.union([z.number(), z.string()]).optional(),
});

const calculateDurationSchema = z.object({
  startTime: z.string().regex(timeRegex, "Invalid startTime format (HH:MM required)"),
  endTime: z.string().regex(timeRegex, "Invalid endTime format (HH:MM required)"),
});

module.exports = {
  createExaminationSchema,
  updateExaminationSchema,
  calculateDurationSchema,
};
