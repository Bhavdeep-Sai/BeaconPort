const { z } = require("zod");

const loginSchoolSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z
  .object({
    token: z.string().optional(),
    access_token: z.string().optional(),
  })
  .refine((data) => Boolean(data.token || data.access_token), {
    message: "Token is required",
    path: ["token"],
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

module.exports = {
  loginSchoolSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
