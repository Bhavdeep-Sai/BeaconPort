const express = require("express");
const {
  registerSchool,
  getAllSchools,
  loginSchool,
  updateSchool,
  getSchoolOwnData,
  registerSchoolGoogle,
  loginSchoolGoogle,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require("../controllers/schoolController");
const authMiddleware = require("../auth/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  loginSchoolSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../schemas/schoolSchemas");

const router = express.Router();

router.post("/register", registerSchool);
router.post("/login", validateRequest({ body: loginSchoolSchema }), loginSchool);
router.post("/register/google", registerSchoolGoogle);
router.post("/login/oauth", validateRequest({ body: googleAuthSchema }), loginSchoolGoogle);
router.post("/forgot-password", validateRequest({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", validateRequest({ body: resetPasswordSchema }), resetPassword);

router.get("/verify-reset-token/:token", verifyResetToken);
router.get("/all", getAllSchools);
router.put("/update", authMiddleware(["SCHOOL"]), updateSchool);
router.get("/fetch-single", authMiddleware(["SCHOOL"]), getSchoolOwnData);

module.exports = router;
