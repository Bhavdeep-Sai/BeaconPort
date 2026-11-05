const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  FRONTEND_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  ENABLE_IN_PROCESS_CRON: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  LOG_LEVEL: z.string().optional(),
});

function validateEnv(envInput = process.env, shouldExit = (process.env.NODE_ENV !== "test")) {
  const input = { ...envInput };
  // In test environment, provide fallbacks if memory server hasn't set them yet
  if (input.NODE_ENV === "test") {
    if (!input.MONGO_URI) input.MONGO_URI = "mongodb://localhost:27017/test_memory_db";
    if (!input.JWT_SECRET) input.JWT_SECRET = "test_jwt_secret_key_at_least_32_characters";
  }

  const result = envSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const errorDetails = issues.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    );
    const message = `[FATAL] Environment validation failed:\n  - ${errorDetails.join("\n  - ")}`;
    if (shouldExit) {
      console.error(message);
      process.exit(1);
    }
    throw new Error(message);
  }

  return result.data;
}

const env = validateEnv();

module.exports = {
  env,
  validateEnv,
  envSchema,
};
