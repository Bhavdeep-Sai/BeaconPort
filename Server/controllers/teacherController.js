const formidable = require("formidable");
const Teacher = require("../models/teacherModel");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary"); // Import your cloudinary config

module.exports = {
  registerTeacher: async (req, res) => {
    try {
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res
            .status(400)
            .json({ success: false, message: "Form parsing error" });
        }

        if (!files.image || !files.image[0]) {
          return res
            .status(400)
            .json({ success: false, message: "Teacher image is required" });
        }

        // Check for required fields based on the schema
        const requiredFields = [
          "email",
          "name",
          "qualification",
          "age",
          "gender",
          "password",
        ];
        for (const field of requiredFields) {
          if (!fields[field] || !fields[field][0]) {
            return res.status(400).json({
              success: false,
              message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
            });
          }
        }

        // Check if email already exists
        const existingTeacher = await Teacher.findOne({
          email: fields.email[0],
        });

        if (existingTeacher) {
          return res.status(409).json({
            success: false,
            message: "Email already exists. Please use a different email.",
          });
        }

        const photo = files.image[0];
        let cloudinaryResult;

        try {
          // Upload image to Cloudinary
          cloudinaryResult = await cloudinary.uploader.upload(photo.filepath, {
            folder: "teachers", // Organize images in a folder
            resource_type: "image",
            transformation: [
              { width: 500, height: 500, crop: "limit" },
              { quality: "auto" }
            ]
          });
        } catch (cloudinaryError) {
          console.error("Cloudinary upload error:", cloudinaryError);
          return res.status(500).json({
            success: false,
            message: "Image upload failed"
          });
        }

        let teacherClasses = [];
        if (fields.teacherClasses && fields.teacherClasses[0]) {
          try {
            teacherClasses = JSON.parse(fields.teacherClasses[0]);
          } catch (e) {
            console.error("Error parsing teacherClasses:", e);
          }
        }

        let subjects = [];
        if (fields.subjects && fields.subjects[0]) {
          try {
            subjects = JSON.parse(fields.subjects[0]);
          } catch (e) {
            console.error("Error parsing subjects:", e);
          }
        } else if (fields.subject && fields.subject[0]) {
          try {
            subjects = JSON.parse(fields.subject[0]);
          } catch (e) {
            subjects = [fields.subject[0]];
          }
        }

        const newTeacher = new Teacher({
          school: req.user.schoolId,
          email: fields.email[0],
          name: fields.name[0],
          qualification: fields.qualification[0],
          subjects: subjects,
          teacherClasses: teacherClasses,
          age: fields.age[0],
          gender: fields.gender[0],
          teacherImg: cloudinaryResult.secure_url, // Store Cloudinary URL
          teacherImgPublicId: cloudinaryResult.public_id, // Store public_id for deletion
          password: fields.password[0], // Store password as plain text (as requested)
          salary: fields.salary && fields.salary[0] ? parseFloat(fields.salary[0]) : 0,
        });

        const savedTeacher = await newTeacher.save();
        res.status(200).json({
          success: true,
          data: savedTeacher,
          message: "Teacher is registered Successfully",
        });
      });
    } catch (error) {
      console.error("Register Teacher error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  loginTeacher: async (req, res) => {
    try {
      const teacher = await Teacher.findOne({ email: req.body.email });

      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: "Email not found" });
      }

      if (req.body.password === teacher.password) {
        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
          {
            id: teacher._id,
            schoolId: teacher.school,
            name: teacher.name,
            teacherImg: teacher.teacherImg,
            role: "TEACHER",
          },
          jwtSecret
        );

        res.header("Authorization", token);

        return res.status(200).json({
          success: true,
          message: "Success Login.",
          user: {
            id: teacher._id,
            schoolId: teacher.school,
            name: teacher.name,
            teacherImg: teacher.teacherImg,
            role: "TEACHER",
          },
          token: token,
        });
      } else {
        return res
          .status(401)
          .json({ success: false, message: "Password is Incorrect" });
      }
    } catch (error) {
      console.error("Login Teacher error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error [Teacher LOGIN]",
      });
    }
  },

  getTeachersWithQuery: async (req, res) => {
    try {
      const filterQuery = { school: req.user.schoolId };

      if (req.query.search) {
        filterQuery.name = { $regex: req.query.search, $options: "i" };
      }

      if (req.query.teacherClass) {
        filterQuery.teacherClasses = req.query.teacherClass;
      }

      if (req.query.subject) {
        filterQuery.subjects = req.query.subject;
      }

      const teachers = await Teacher.find(filterQuery)
        .populate("teacherClasses")
        .populate("subjects")
        .select("-password");

      res.status(200).json({
        success: true,
        message: teachers.length > 0 ? "Data Found" : "No Teachers Found",
        teachers,
      });
    } catch (error) {
      console.error("Get all Teachers error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  getTeacherOwnData: async (req, res) => {
    try {
      const id = req.user.id;
      const schoolId = req.user.schoolId;
      const teacher = await Teacher.findOne({ _id: id, school: schoolId })
        .populate("teacherClasses")
        .populate("subjects");

      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: "Teacher Not Found" });
      }

      res.status(200).json({ success: true, teacher });
    } catch (error) {
      console.error("Get Teacher own data error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  fetchTeacherWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;
      const teacher = await Teacher.findOne({ _id: id, school: schoolId })
        .populate("teacherClasses")
        .populate("subjects");

      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: "Teacher Not Found" });
      }

      res.status(200).json({ success: true, teacher });
    } catch (error) {
      console.error("Get Teacher by id error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  updateTeacher: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;
      const form = new formidable.IncomingForm();

      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res
            .status(400)
            .json({ success: false, message: "Form parsing error" });
        }

        const teacher = await Teacher.findOne({ _id: id, school: schoolId });

        if (!teacher) {
          return res
            .status(404)
            .json({ success: false, message: "Teacher not found" });
        }

        // Update fields from form data (take first element if array)
        Object.keys(fields).forEach((field) => {
          // Handle special cases and skip password updates here
          if (
            field !== "teacherClasses" &&
            field !== "subjects" &&
            field !== "password" // Handle password separately
          ) {
            // Coerce salary to number explicitly
            if (field === 'salary') {
              const val = Array.isArray(fields[field]) ? fields[field][0] : fields[field];
              teacher.salary = val ? parseFloat(val) : 0;
            } else {
              teacher[field] = Array.isArray(fields[field])
                ? fields[field][0]
                : fields[field];
            }
          }
        });

        // Handle teacherClasses as JSON array
        if (fields.teacherClasses && fields.teacherClasses[0]) {
          try {
            teacher.teacherClasses = JSON.parse(fields.teacherClasses[0]);
          } catch (e) {
            console.error("Error parsing teacherClasses:", e);
          }
        }

        // Handle subjects as JSON array
        if (fields.subjects && fields.subjects[0]) {
          try {
            teacher.subjects = JSON.parse(fields.subjects[0]);
          } catch (e) {
            console.error("Error parsing subjects:", e);
          }
        } else if (fields.subject && fields.subject[0]) {
          // For backward compatibility
          try {
            teacher.subjects = JSON.parse(fields.subject[0]);
          } catch (e) {
            teacher.subjects = [fields.subject[0]];
          }
        }

        // Handle password updates separately (store as plain text)
        if (fields.password && fields.password[0]) {
          teacher.password = fields.password[0];
        }

        // Handle image update if provided
        if (files.image && files.image[0]) {
          const photo = files.image[0];
          let cloudinaryResult;

          try {
            // Delete old image from Cloudinary if exists
            if (teacher.teacherImgPublicId) {
              try {
                await cloudinary.uploader.destroy(teacher.teacherImgPublicId);
                console.log("Old image deleted from Cloudinary");
              } catch (deleteError) {
                console.error("Error deleting old image from Cloudinary:", deleteError);
                // Continue with upload even if deletion fails
              }
            }

            // Upload new image to Cloudinary
            cloudinaryResult = await cloudinary.uploader.upload(photo.filepath, {
              folder: "teachers",
              resource_type: "image",
              transformation: [
                { width: 500, height: 500, crop: "limit" },
                { quality: "auto" }
              ]
            });

            teacher.teacherImg = cloudinaryResult.secure_url;
            teacher.teacherImgPublicId = cloudinaryResult.public_id;
            
            console.log("New image uploaded to Cloudinary:", cloudinaryResult.secure_url);
          } catch (cloudinaryError) {
            console.error("Cloudinary update error:", cloudinaryError);
            return res.status(500).json({
              success: false,
              message: "Image update failed"
            });
          }
        }

        // Save the updated teacher
        try {
          await teacher.save();
          console.log("Teacher updated successfully");
        } catch (saveError) {
          console.error("Error saving teacher:", saveError);
          return res.status(500).json({
            success: false,
            message: "Failed to save teacher data"
          });
        }

        // Return updated teacher without sensitive data
        const updatedTeacher = await Teacher.findById(teacher._id)
          .populate("teacherClasses")
          .populate("subjects")
          .select("-password");

        res.status(200).json({
          success: true,
          message: "Teacher data Updated",
          teacher: updatedTeacher,
        });
      });
    } catch (error) {
      console.error("Update Teacher error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  deleteTeacherWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;

      // First find the teacher to get the image public_id
      const teacherToDelete = await Teacher.findOne({
        _id: id,
        school: schoolId,
      });

      if (!teacherToDelete) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // Delete teacher image from Cloudinary if exists
      if (teacherToDelete.teacherImgPublicId) {
        try {
          await cloudinary.uploader.destroy(teacherToDelete.teacherImgPublicId);
          console.log("Teacher image deleted from Cloudinary:", teacherToDelete.teacherImgPublicId);
        } catch (cloudinaryError) {
          console.error("Error deleting image from Cloudinary:", cloudinaryError);
          // Continue with teacher deletion even if image deletion fails
        }
      }

      // Now delete the teacher from database
      const deletedTeacher = await Teacher.findOneAndDelete({
        _id: id,
        school: schoolId,
      });

      if (!deletedTeacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found or already deleted",
        });
      }

      res.status(200).json({
        success: true,
        message: "Teacher and associated image deleted successfully",
      });
    } catch (error) {
      console.error("Delete Teacher error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  // Additional helper method to clean up orphaned images
  cleanupOrphanedImages: async (req, res) => {
    try {
      // This is an optional method to clean up any orphaned images in Cloudinary
      // You can call this periodically or manually when needed
      
      const teachers = await Teacher.find({ school: req.user.schoolId });
      const teacherImageIds = teachers
        .filter(teacher => teacher.teacherImgPublicId)
        .map(teacher => teacher.teacherImgPublicId);

      // Get all images from Cloudinary teachers folder
      const cloudinaryImages = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'teachers/',
        max_results: 500
      });

      // Find orphaned images
      const orphanedImages = cloudinaryImages.resources.filter(
        image => !teacherImageIds.includes(image.public_id)
      );

      // Delete orphaned images
      const deletionPromises = orphanedImages.map(image => 
        cloudinary.uploader.destroy(image.public_id)
      );

      await Promise.all(deletionPromises);

      res.status(200).json({
        success: true,
        message: `Cleaned up ${orphanedImages.length} orphaned images`,
        deletedImages: orphanedImages.length
      });
    } catch (error) {
      console.error("Cleanup orphaned images error:", error);
      res.status(500).json({
        success: false,
        message: "Error cleaning up orphaned images"
      });
    }
  }
};