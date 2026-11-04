const { z } = require("zod");

const createNoticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message cannot exceed 2000 characters"),
  audience: z.enum(["Student", "Teacher", "All"], {
    errorMap: () => ({ message: "Audience must be 'Student', 'Teacher', or 'All'" }),
  }),
  isImportant: z.boolean().optional().default(false),
  expiryDate: z.string().optional(),
});

const updateNoticeSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  message: z.string().trim().min(1).max(2000).optional(),
  audience: z.enum(["Student", "Teacher", "All"]).optional(),
  isImportant: z.boolean().optional(),
  expiryDate: z.string().optional(),
});

const batchDeleteNoticeSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Please provide an array of notice IDs"),
});

module.exports = {
  createNoticeSchema,
  updateNoticeSchema,
  batchDeleteNoticeSchema,
};
