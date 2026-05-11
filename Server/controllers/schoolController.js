require("dotenv").config();
const formidable = require("formidable");
const School = require("../models/schoolModel");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (filePath, folder = "school_management") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: true,
      resource_type: "image",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return { result: "ok" };

    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return { result: "error", error: error.message };
  }
};

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Helper function to clean up temporary files
const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error cleaning up temp file:", error);
  }
};

module.exports = {
  registerSchool: async (req, res) => {
    let tempFilePath = null;

    try {
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
          // Validate required fields
          const requiredFields = [
            "schoolName",
            "email",
            "ownerName",
            "password",
          ];
          for (const field of requiredFields) {
            if (!fields[field] || !fields[field][0]) {
              return res.status(400).json({
                success: false,
                message: `${field} is required`,
              });
            }
          }

          // Validate image
          if (!files.image || !files.image[0]) {
            return res.status(400).json({
              success: false,
              message: "School image is required",
            });
          }

          const photo = files.image[0];
          tempFilePath = photo.filepath;

          // Validate image file
          if (!photo.mimetype || !photo.mimetype.startsWith("image/")) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "Please upload a valid image file",
            });
          }

          // Check if school with email already exists
          const existingSchool = await School.findOne({
            email: fields.email[0],
          });
          if (existingSchool) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "School with this email already exists",
            });
          }

          // Upload image to Cloudinary
          const uploadResult = await uploadToCloudinary(
            photo.filepath,
            "school_management/schools"
          );

          if (!uploadResult.success) {
            cleanupTempFile(tempFilePath);
            return res.status(500).json({
              success: false,
              message: "Failed to upload image to cloud storage",
              error: uploadResult.error,
            });
          }

          // Clean up temporary file
          cleanupTempFile(tempFilePath);

          // Hash password
          const salt = bcrypt.genSaltSync(10);
          const hashPassword = bcrypt.hashSync(fields.password[0], salt);

          // Create new school
          const newSchool = new School({
            schoolName: fields.schoolName[0].trim(),
            email: fields.email[0].toLowerCase().trim(),
            ownerName: fields.ownerName[0].trim(),
            schoolImg: uploadResult.url,
            schoolImgPublicId: uploadResult.public_id,
            password: hashPassword,
          });

          const savedSchool = await newSchool.save();

          // Issue JWT so client can auto-login
          const jwtSecret = process.env.JWT_SECRET;
          const token = jwt.sign(
            {
              id: savedSchool._id,
              schoolId: savedSchool._id,
              ownerName: savedSchool.ownerName,
              schoolName: savedSchool.schoolName,
              schoolImg: savedSchool.schoolImg,
              role: "SCHOOL",
            },
            jwtSecret,
            { expiresIn: "7d" }
          );

          // Remove password from response
          const schoolData = savedSchool.toObject();
          delete schoolData.password;
          delete schoolData.resetPasswordToken;
          delete schoolData.resetPasswordExpires;

          res.header("Authorization", token);
          res.status(201).json({
            success: true,
            data: schoolData,
            message: "School registered successfully",
            token: token,
            user: {
              id: savedSchool._id,
              ownerName: savedSchool.ownerName,
              schoolName: savedSchool.schoolName,
              schoolImg: savedSchool.schoolImg,
              email: savedSchool.email,
              role: "SCHOOL",
            },
          });
        } catch (innerError) {
          cleanupTempFile(tempFilePath);
          console.error("Inner registration error:", innerError);

          if (innerError.code === 11000) {
            return res.status(400).json({
              success: false,
              message: "School with this email already exists",
            });
          }

          throw innerError;
        }
      });
    } catch (error) {
      cleanupTempFile(tempFilePath);
      console.error("Register school error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  registerSchoolGoogle: async (req, res) => {
    let tempFilePath = null;

    try {
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
          const { token, schoolName, ownerName } = fields;

          // Validate required fields
          if (
            !token ||
            !token[0] ||
            !schoolName ||
            !schoolName[0] ||
            !ownerName ||
            !ownerName[0]
          ) {
            return res.status(400).json({
              success: false,
              message: "Google token, school name, and owner name are required",
            });
          }

          // Validate image
          if (!files.image || !files.image[0]) {
            return res.status(400).json({
              success: false,
              message: "School image is required",
            });
          }

          const photo = files.image[0];
          tempFilePath = photo.filepath;

          // Validate image file
          if (!photo.mimetype || !photo.mimetype.startsWith("image/")) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "Please upload a valid image file",
            });
          }

          // Verify Google token
          const googleResponse = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token[0]}`,
            { timeout: 10000 }
          );

          const { email, id: googleId, name } = googleResponse.data;

          if (!email || !googleId) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message: "Invalid Google token - missing user data",
            });
          }

          // Check if school already exists
          const existingSchool = await School.findOne({
            $or: [
              { email: email },
              { oauthId: googleId, oauthProvider: "google" },
            ],
          });

          if (existingSchool) {
            cleanupTempFile(tempFilePath);
            return res.status(400).json({
              success: false,
              message:
                "School with this email or Google account already exists",
            });
          }

          // Upload image to Cloudinary
          const uploadResult = await uploadToCloudinary(
            photo.filepath,
            "school_management/schools/google"
          );

          if (!uploadResult.success) {
            cleanupTempFile(tempFilePath);
            return res.status(500).json({
              success: false,
              message: "Failed to upload image to cloud storage",
              error: uploadResult.error,
            });
          }

          // Clean up temporary file
          cleanupTempFile(tempFilePath);

          // Generate a random password for OAuth users
          const randomPassword = crypto.randomBytes(16).toString("hex");
          const salt = bcrypt.genSaltSync(10);
          const hashPassword = bcrypt.hashSync(randomPassword, salt);

          // Create new school
          const newSchool = new School({
            schoolName: schoolName[0].trim(),
            email: email.toLowerCase().trim(),
            ownerName: ownerName[0].trim(),
            schoolImg: uploadResult.url,
            schoolImgPublicId: uploadResult.public_id,
            password: hashPassword,
            oauthProvider: "google",
            oauthId: googleId,
            isOAuthUser: true,
          });

          const savedSchool = await newSchool.save();

          // Issue JWT so client can auto-login
          const jwtSecret = process.env.JWT_SECRET;
          const jwtToken = jwt.sign(
            {
              id: savedSchool._id,
              schoolId: savedSchool._id,
              ownerName: savedSchool.ownerName,
              schoolName: savedSchool.schoolName,
              schoolImg: savedSchool.schoolImg,
              role: "SCHOOL",
            },
            jwtSecret,
            { expiresIn: "7d" }
          );

          // Remove sensitive data from response
          const schoolData = savedSchool.toObject();
          delete schoolData.password;
          delete schoolData.resetPasswordToken;
          delete schoolData.resetPasswordExpires;

          res.header("Authorization", jwtToken);
          res.status(201).json({
            success: true,
            message: "School registered successfully with Google",
            data: schoolData,
            token: jwtToken,
            user: {
              id: savedSchool._id,
              ownerName: savedSchool.ownerName,
              schoolName: savedSchool.schoolName,
              schoolImg: savedSchool.schoolImg,
              email: savedSchool.email,
              role: "SCHOOL",
            },
          });
        } catch (googleError) {
          cleanupTempFile(tempFilePath);
          console.error("Google OAuth verification error:", googleError);

          if (googleError.response?.status === 401) {
            return res.status(400).json({
              success: false,
              message: "Invalid or expired Google token",
            });
          }

          return res.status(400).json({
            success: false,
            message: "Google token verification failed",
          });
        }
      });
    } catch (error) {
      cleanupTempFile(tempFilePath);
      console.error("Google OAuth registration error:", error);
      res.status(500).json({
        success: false,
        message: "Google OAuth registration failed",
      });
    }
  },

  loginSchool: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const school = await School.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      // Check if it's an OAuth user trying to login with password
      if (school.isOAuthUser) {
        return res.status(400).json({
          success: false,
          message: `This account was created with ${school.oauthProvider}. Please use ${school.oauthProvider} login.`,
        });
      }

      const isAuth = await bcrypt.compare(password, school.password);

      if (!isAuth) {
        return res.status(401).json({
          success: false,
          message: "Password is incorrect",
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = jwt.sign(
        {
          id: school._id,
          schoolId: school._id,
          ownerName: school.ownerName,
          schoolName: school.schoolName,
          schoolImg: school.schoolImg,
          role: "SCHOOL",
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      res.header("Authorization", token);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: school._id,
          ownerName: school.ownerName,
          schoolName: school.schoolName,
          schoolImg: school.schoolImg,
          email: school.email,
          role: "SCHOOL",
        },
        token: token,
      });
    } catch (error) {
      console.error("Login school error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during login",
      });
    }
  },

  loginSchoolGoogle: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required for OAuth login",
        });
      }

      // Find school with Google OAuth
      const school = await School.findOne({
        email: email.toLowerCase().trim(),
        oauthProvider: "google",
        isOAuthUser: true,
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "No account found with this Google account",
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = jwt.sign(
        {
          id: school._id,
          schoolId: school._id,
          ownerName: school.ownerName,
          schoolName: school.schoolName,
          schoolImg: school.schoolImg,
          role: "SCHOOL",
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      res.header("Authorization", token);

      return res.status(200).json({
        success: true,
        message: "Google login successful",
        user: {
          id: school._id,
          ownerName: school.ownerName,
          schoolName: school.schoolName,
          schoolImg: school.schoolImg,
          email: school.email,
          role: "SCHOOL",
        },
        token: token,
      });
    } catch (error) {
      console.error("Google OAuth login error:", error);
      res.status(500).json({
        success: false,
        message: "Google OAuth login failed",
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find the school by email
      const school = await School.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email address",
        });
      }

      // Check if it's an OAuth user
      if (school.isOAuthUser) {
        return res.status(400).json({
          success: false,
          message: `This account was created with ${school.oauthProvider}. Please use ${school.oauthProvider} login to access your account.`,
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to database
      school.resetPasswordToken = resetToken;
      school.resetPasswordExpires = resetTokenExpiry;
      await school.save();

      // Create password reset URL
      const frontedURL = process.env.FRONTEND_URL;
      const resetURL = `${frontedURL}/reset-password/${resetToken}`;

      // Email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request - School Management System",
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #FF9800;">Password Reset Request</h2>
            <p>Dear ${school.ownerName},</p>
            <p>You have requested to reset your password for your School Management System account.</p>
            <p>Please click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" 
                 style="background: linear-gradient(45deg, #FF9800 30%, #FF5722 90%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetURL}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
            <br>
            <p>Best regards,<br>BeaconPort Team</p>
          </div>
        `,
      };

      // Send email
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);

      res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your email address",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send password reset email. Please try again later.",
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Reset token and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Find school with valid reset token
      const school = await School.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!school) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password
      const salt = bcrypt.genSaltSync(10);
      const hashPassword = bcrypt.hashSync(newPassword, salt);

      // Update password and clear reset token
      school.password = hashPassword;
      school.resetPasswordToken = null;
      school.resetPasswordExpires = null;
      await school.save();

      res.status(200).json({
        success: true,
        message: "Password has been reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password. Please try again.",
      });
    }
  },

  verifyResetToken: async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Reset token is required",
        });
      }

      const school = await School.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!school) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      res.status(200).json({
        success: true,
        message: "Token is valid",
        schoolName: school.schoolName,
      });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify reset token",
      });
    }
  },

  getAllSchools: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const schools = await School.find()
        .select("-password -__v -resetPasswordToken -resetPasswordExpires")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await School.countDocuments();

      if (!schools || schools.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No schools found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Schools retrieved successfully",
        schools,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalSchools: total,
          hasNextPage: skip + schools.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get all schools error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  getSchoolOwnData: async (req, res) => {
    try {
      const id = req.user.id;

      const school = await School.findOne({ _id: id }).select(
        "-password -resetPasswordToken -resetPasswordExpires -__v"
      );

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "School data retrieved successfully",
        school,
      });
    } catch (error) {
      console.error("Get school own data error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  // Update School
  updateSchool: async (req, res) => {
    let tempFilePath = null;

    try {
      const id = req.user.id;

      const form = new formidable.IncomingForm({
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
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
          const school = await School.findOne({ _id: id });

          if (!school) {
            return res.status(404).json({
              success: false,
              message: "School not found",
            });
          }

          // Update basic fields
          const allowedFields = ["schoolName", "ownerName", "email"];
          allowedFields.forEach((field) => {
            if (fields[field] && fields[field][0]) {
              school[field] = fields[field][0].trim();
            }
          });

          // Handle image update if provided
          if (files.image && files.image[0]) {
            const photo = files.image[0];
            tempFilePath = photo.filepath;

            // Validate image file
            if (!photo.mimetype || !photo.mimetype.startsWith("image/")) {
              cleanupTempFile(tempFilePath);
              return res.status(400).json({
                success: false,
                message: "Please upload a valid image file",
              });
            }

            // Upload new image to Cloudinary
            const uploadResult = await uploadToCloudinary(
              photo.filepath,
              "school_management/schools/updated"
            );

            if (!uploadResult.success) {
              cleanupTempFile(tempFilePath);
              return res.status(500).json({
                success: false,
                message: "Failed to upload new image to cloud storage",
                error: uploadResult.error,
              });
            }

            // Delete old image from Cloudinary if it exists
            if (school.schoolImgPublicId) {
              await deleteFromCloudinary(school.schoolImgPublicId);
            }

            // Clean up temporary file
            cleanupTempFile(tempFilePath);

            // Update school image references
            school.schoolImg = uploadResult.url;
            school.schoolImgPublicId = uploadResult.public_id;
          }

          await school.save();

          // Return updated school data without sensitive information
          const updatedSchool = school.toObject();
          delete updatedSchool.password;
          delete updatedSchool.resetPasswordToken;
          delete updatedSchool.resetPasswordExpires;
          delete updatedSchool.__v;

          res.status(200).json({
            success: true,
            message: "School data updated successfully",
            school: updatedSchool,
          });
        } catch (innerError) {
          cleanupTempFile(tempFilePath);
          console.error("Inner update error:", innerError);

          if (innerError.code === 11000) {
            return res.status(400).json({
              success: false,
              message: "Email already exists",
            });
          }

          throw innerError;
        }
      });
    } catch (error) {
      cleanupTempFile(tempFilePath);
      console.error("Update school error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  // Delete School
  deleteSchool: async (req, res) => {
    try {
      const id = req.user.id;

      const school = await School.findOne({ _id: id });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      // Delete image from Cloudinary if exists
      if (school.schoolImgPublicId) {
        await deleteFromCloudinary(school.schoolImgPublicId);
      }

      // Delete school from database
      await School.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "School account deleted successfully",
      });
    } catch (error) {
      console.error("Delete school error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  },
};
