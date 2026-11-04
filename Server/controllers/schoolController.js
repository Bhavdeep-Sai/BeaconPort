const formidable = require("formidable");
const fs = require("fs");
const schoolService = require("../services/schoolService");
const School = require("../models/schoolModel");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error({ error }, "Error cleaning up temp file");
  }
};

const schoolController = {
  registerSchool: (req, res, next) => {
    let tempFilePath = null;

    const form = new formidable.IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      allowEmptyFiles: false,
      filter: ({ name, originalFilename, mimetype }) => {
        return name === "image" && mimetype && mimetype.includes("image");
      },
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "Form parsing error: " + err.message,
        });
      }

      try {
        const schoolName = fields.schoolName ? fields.schoolName[0] : null;
        const email = fields.email ? fields.email[0] : null;
        const password = fields.password ? fields.password[0] : null;
        const ownerName = fields.ownerName ? fields.ownerName[0] : null;

        if (files.image && files.image[0]) {
          const photo = files.image[0];
          tempFilePath = photo.filepath;

          if (!photo.mimetype || !photo.mimetype.startsWith("image/")) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "Invalid file type. Only image files are allowed.",
            });
          }
        }

        const result = await schoolService.registerSchool({
          schoolName,
          email,
          password,
          ownerName,
          imageFilePath: tempFilePath,
        });

        cleanupTempFile(tempFilePath);

        res.status(201).json({
          success: true,
          message: "School registered successfully",
          token: result.token,
          school: result.school,
        });
      } catch (error) {
        cleanupTempFile(tempFilePath);
        next(error);
      }
    });
  },

  loginSchool: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await schoolService.loginSchool({ email, password });

    res.header("Authorization", result.token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: result.user,
      token: result.token,
    });
  }),

  loginSchoolGoogle: asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.access_token;
    const result = await schoolService.verifyGoogleTokenAndLogin(token);

    res.header("Authorization", result.token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: result.user,
      token: result.token,
    });
  }),

  registerSchoolGoogle: asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.access_token;
    const { schoolName, ownerName } = req.body;

    const result = await schoolService.verifyGoogleTokenAndRegister({
      token,
      schoolName,
      ownerName,
    });

    res.header("Authorization", result.token);

    res.status(201).json({
      success: true,
      message: "Google registration successful",
      token: result.token,
      user: result.user,
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await schoolService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, newPassword, password } = req.body;
    const result = await schoolService.resetPassword({
      token,
      newPassword,
      password,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  verifyResetToken: asyncHandler(async (req, res) => {
    const { token } = req.params;
    const result = await schoolService.verifyResetToken(token);

    res.status(200).json({
      success: true,
      message: result.message,
      schoolName: result.schoolName,
    });
  }),

  getAllSchools: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { schools, pagination } = await schoolService.getAllSchools({
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: "Schools fetched successfully",
      schools,
      pagination,
    });
  }),

  getSchoolOwnData: asyncHandler(async (req, res) => {
    const school = await schoolService.getSchoolOwnData(req.user.id);

    res.status(200).json({
      success: true,
      message: "School data retrieved successfully",
      school,
    });
  }),

  updateSchool: (req, res, next) => {
    let tempFilePath = null;

    const form = new formidable.IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      allowEmptyFiles: true,
      filter: ({ name, originalFilename, mimetype }) => {
        if (name === "image" && originalFilename) {
          return mimetype && mimetype.includes("image");
        }
        return true;
      },
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "Form parsing error: " + err.message,
        });
      }

      try {
        const id = req.user.id;
        const school = await School.findById(id);

        if (!school) {
          return res.status(404).json({
            success: false,
            message: "School not found",
          });
        }

        const allowedFields = ["schoolName", "ownerName", "email"];
        allowedFields.forEach((field) => {
          if (fields[field] && fields[field][0]) {
            school[field] = fields[field][0].trim();
          }
        });

        if (files.image && files.image[0]) {
          const photo = files.image[0];
          tempFilePath = photo.filepath;

          if (!photo.mimetype || !photo.mimetype.startsWith("image/")) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "Invalid file type. Only image files are allowed.",
            });
          }

          if (school.imagePublicId) {
            await schoolService.deleteFromCloudinary(school.imagePublicId);
          }

          const uploadResult = await schoolService.uploadToCloudinary(tempFilePath);
          if (uploadResult.success) {
            school.schoolImg = uploadResult.url;
            school.imagePublicId = uploadResult.public_id;
          }
        }

        await school.save();
        cleanupTempFile(tempFilePath);

        const updatedSchool = school.toObject();
        delete updatedSchool.password;
        delete updatedSchool.resetPasswordToken;
        delete updatedSchool.resetPasswordExpires;

        res.status(200).json({
          success: true,
          message: "School updated successfully",
          school: updatedSchool,
        });
      } catch (error) {
        cleanupTempFile(tempFilePath);
        next(error);
      }
    });
  },
};

module.exports = schoolController;
