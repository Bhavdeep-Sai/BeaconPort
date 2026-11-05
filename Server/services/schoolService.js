const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const School = require("../models/schoolModel");
const logger = require("../utils/logger");
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require("../utils/errors");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sanitizeSchool = (school) => {
  const schoolObj = school.toObject ? school.toObject() : { ...school };
  delete schoolObj.password;
  delete schoolObj.resetPasswordToken;
  delete schoolObj.resetPasswordExpires;
  delete schoolObj.__v;
  return schoolObj;
};

class SchoolService {
  async uploadToCloudinary(filePath, folder = "school_management") {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        use_filename: true,
        unique_filename: true,
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });
      return { success: true, url: result.secure_url, public_id: result.public_id };
    } catch (error) {
      logger.error({ error }, "Cloudinary upload error");
      return { success: false, error: error.message };
    }
  }

  async deleteFromCloudinary(public_id) {
    try {
      if (!public_id) return { result: "ok" };
      return await cloudinary.uploader.destroy(public_id);
    } catch (error) {
      logger.error({ error }, "Cloudinary delete error");
      return { result: "error", error: error.message };
    }
  }

  generateToken(school) {
    return jwt.sign(
      {
        id: school._id,
        schoolId: school._id,
        ownerName: school.ownerName,
        schoolName: school.schoolName,
        schoolImg: school.schoolImg,
        role: "SCHOOL",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  }

  createTransporter() {
    return nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async registerSchool({ schoolName, email, password, ownerName, imageFilePath }) {
    if (!schoolName || !email || !password || !ownerName) {
      throw new BadRequestError("All required fields must be provided");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingSchool = await School.findOne({ email: normalizedEmail });
    if (existingSchool) {
      throw new ConflictError("School with this email already exists");
    }

    let schoolImg = null;
    let imagePublicId = null;

    if (imageFilePath) {
      const uploadResult = await this.uploadToCloudinary(imageFilePath);
      if (uploadResult.success) {
        schoolImg = uploadResult.url;
        imagePublicId = uploadResult.public_id;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const school = new School({
      schoolName: schoolName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      ownerName: ownerName.trim(),
      schoolImg,
      imagePublicId,
    });

    await school.save();
    const token = this.generateToken(school);

    return {
      token,
      school: sanitizeSchool(school),
    };
  }

  async loginSchool({ email, password }) {
    if (!email || !password) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const school = await School.findOne({ email: normalizedEmail }).select("+password");
    if (!school) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, school.password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = this.generateToken(school);

    return {
      token,
      user: {
        id: school._id,
        ownerName: school.ownerName,
        schoolName: school.schoolName,
        schoolImg: school.schoolImg,
        email: school.email,
        role: "SCHOOL",
      },
    };
  }

  async verifyGoogleTokenAndLogin(token) {
    if (!token) {
      throw new BadRequestError("Google token is required for OAuth login");
    }

    let googleData;
    try {
      const googleRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`,
        { timeout: 10000 }
      );
      googleData = googleRes.data;
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired Google token");
    }

    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    const tokenAud = googleData.aud || googleData.azp;
    if (expectedAud && tokenAud !== expectedAud) {
      throw new ForbiddenError("Google token audience mismatch");
    }

    if (googleData.email_verified !== "true" && googleData.email_verified !== true) {
      throw new ForbiddenError("Google email is not verified");
    }

    const email = googleData.email ? googleData.email.toLowerCase().trim() : null;
    if (!email) {
      throw new BadRequestError("Google account has no associated email address");
    }

    const school = await School.findOne({ email });
    if (!school) {
      throw new UnauthorizedError("No school registered with this Google email. Please register first.");
    }

    const jwtToken = this.generateToken(school);

    return {
      token: jwtToken,
      user: {
        id: school._id,
        ownerName: school.ownerName,
        schoolName: school.schoolName,
        schoolImg: school.schoolImg,
        email: school.email,
        role: "SCHOOL",
      },
    };
  }

  async verifyGoogleTokenAndRegister({ token, schoolName, ownerName }) {
    if (!token) {
      throw new BadRequestError("Google token is required for registration");
    }

    let googleData;
    try {
      const googleRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`,
        { timeout: 10000 }
      );
      googleData = googleRes.data;
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired Google token");
    }

    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    const tokenAud = googleData.aud || googleData.azp;
    if (expectedAud && tokenAud !== expectedAud) {
      throw new ForbiddenError("Google token audience mismatch");
    }

    if (googleData.email_verified !== "true" && googleData.email_verified !== true) {
      throw new ForbiddenError("Google email is not verified");
    }

    const email = googleData.email ? googleData.email.toLowerCase().trim() : null;
    if (!email) {
      throw new BadRequestError("Google account has no associated email address");
    }

    const existingSchool = await School.findOne({ email });
    if (existingSchool) {
      throw new ConflictError("School with this email already exists");
    }

    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const school = new School({
      schoolName: schoolName || googleData.name || "Google School",
      email,
      password: hashedPassword,
      ownerName: ownerName || googleData.name || "Google User",
      schoolImg: googleData.picture || null,
      authProvider: "google",
      googleId: googleData.sub,
    });

    await school.save();
    const jwtToken = this.generateToken(school);

    return {
      token: jwtToken,
      user: sanitizeSchool(school),
    };
  }

  async forgotPassword(email) {
    if (!email) {
      throw new BadRequestError("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const school = await School.findOne({ email: normalizedEmail });

    if (!school) {
      return {
        message: "If an account with that email exists, a password reset link has been sent.",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    school.resetPasswordToken = hashedToken;
    school.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await school.save();

    try {
      const transporter = this.createTransporter();
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
      await transporter.sendMail({
        to: school.email,
        from: process.env.EMAIL_USER,
        subject: "BeaconPort Password Reset Request",
        text: `You requested a password reset for your school account.\n\nPlease click on the following link or paste it into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n`,
      });
    } catch (emailError) {
      logger.error({ emailError }, "Failed to send reset email");
    }

    return {
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  }

  async resetPassword({ token, newPassword, password }) {
    const rawPassword = newPassword || password;
    if (!token || !rawPassword) {
      throw new BadRequestError("Token and new password are required");
    }

    if (rawPassword.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters long");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const school = await School.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!school) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const hashPassword = await bcrypt.hash(rawPassword, 10);
    school.password = hashPassword;
    school.resetPasswordToken = null;
    school.resetPasswordExpires = null;
    await school.save();

    return {
      message: "Password has been reset successfully",
    };
  }

  async verifyResetToken(token) {
    if (!token) {
      throw new BadRequestError("Reset token is required");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const school = await School.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!school) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    return {
      message: "Token is valid",
      schoolName: school.schoolName,
    };
  }

  async getAllSchools({ page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;

    const [schools, total] = await Promise.all([
      School.find()
        .select("_id schoolName schoolImg")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      School.countDocuments(),
    ]);

    if (!schools || schools.length === 0) {
      throw new NotFoundError("No schools found");
    }

    return {
      schools,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSchools: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getSchoolOwnData(id) {
    const school = await School.findOne({ _id: id }).select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );

    if (!school) {
      throw new NotFoundError("School not found");
    }

    return school;
  }
}

module.exports = new SchoolService();
