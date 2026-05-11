require("dotenv").config();
const formidable = require("formidable");
const Student = require("../models/studentModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary"); // Import Cloudinary config

module.exports = {
  registerStudent: async (req, res) => {
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
            .json({ success: false, message: "Student image is required" });
        }

        const existingStudent = await Student.findOne({
          email: fields.email[0],
        });

        if (existingStudent) {
          return res.status(409).json({
            success: false,
            message: "A student with this email already exists.",
          });
        }

        const photo = files.image[0];
        let cloudinaryResult;

        try {
          // Upload image to Cloudinary
          cloudinaryResult = await cloudinary.uploader.upload(photo.filepath, {
            folder: "school_management/students", // Organize uploads in folders
            public_id: `student_${Date.now()}`, // Unique identifier
            transformation: [
              { width: 500, height: 500, crop: "limit" }, // Resize image
              { quality: "auto" } // Optimize quality
            ]
          });
        } catch (cloudinaryError) {
          console.error("Cloudinary upload error:", cloudinaryError);
          return res.status(500).json({
            success: false,
            message: "Image upload failed"
          });
        }

        const newStudent = new Student({
          school: req.user.schoolId,
          email: fields.email[0],
          name: fields.name[0],
          studentClass: fields.studentClass[0],
          age: fields.age[0],
          gender: fields.gender[0],
          parent: fields.parent[0],
          parentNum: fields.parentNum[0],
          studentImg: cloudinaryResult.secure_url, // Store Cloudinary URL
          cloudinaryPublicId: cloudinaryResult.public_id, // Store public_id for deletion
          password: fields.password[0], // stored as plain-text as per your instruction
          enrolledSubjects: fields.enrolledSubjects ? JSON.parse(fields.enrolledSubjects[0]) : [],
        });

        const savedStudent = await newStudent.save();
        res.status(200).json({
          success: true,
          data: savedStudent,
          message: "Student is registered Successfully",
        });
      });
    } catch (error) {
      console.error("Register Student error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },

  loginStudent: async (req, res) => {
    try {
      const student = await Student.findOne({ email: req.body.email });

      if (student) {
        if (req.body.password === student.password) {
          const jwtSecret = process.env.JWT_SECRET;
          const token = jwt.sign(
            {
              id: student._id,
              schoolId: student.school,
              name: student.name,
              studentImg: student.studentImg,
              role: "STUDENT",
            },
            jwtSecret
          );
          res.header("Authorization", token);

          return res.status(200).json({
            success: true,
            message: "Success Login.",
            user: {
              id: student._id,
              schoolId: student.school,
              name: student.name,
              studentImg: student.studentImg,
              role: "STUDENT",
            },
            token: token,
          });
        } else {
          return res
            .status(401)
            .json({ success: false, message: "Password is Incorrect" });
        }
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Email not found" });
      }
    } catch (error) {
      console.error("Login Student error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error [Student LOGIN]",
        });
    }
  },

  getStudentsWithQuery: async (req, res) => {
    try {
      const filterQuery = { school: req.user.schoolId };

      if (req.query.search) {
        filterQuery.name = { $regex: req.query.search, $options: "i" };
      }

      if (req.query.studentClass) {
        filterQuery.studentClass = req.query.studentClass;
      }

      const students = await Student.find(filterQuery).populate('studentClass').populate('enrolledSubjects', 'subjectName subjectFee subjectCode');

      res.status(200).json({ success: true, message: students.length > 0 ? "Data Found" : "No Student data found", students: students || [] });
    } catch (error) {
      console.error("Get all Students error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  getStudentOwnData: async (req, res) => {
    try {
      const id = req.user.id;
      const schoolId = req.user.schoolId;
      const student = await Student.findOne({
        _id: id,
        school: schoolId,
      }).populate('studentClass');

      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student Not Found" });
      }

      res.status(200).json({ success: true, student });
    } catch (error) {
      console.error("Get Student own data error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  fetchStudentWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;
      const student = await Student.findOne({ _id: id, school: schoolId });

      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student Not Found" });
      }

      res.status(200).json({ success: true, student });
    } catch (error) {
      console.error("Get Student by id error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  updateStudent: async (req, res) => {
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

        const student = await Student.findOne({ _id: id, school: schoolId });

        if (!student) {
          return res
            .status(404)
            .json({ success: false, message: "Student not found" });
        }

        // Store old cloudinary public_id for cleanup
        const oldCloudinaryPublicId = student.cloudinaryPublicId;

        // Update fields from form data (take first element if array)
        Object.keys(fields).forEach((field) => {
          if (field === 'enrolledSubjects') return; // handled separately
          student[field] = Array.isArray(fields[field])
            ? fields[field][0]
            : fields[field];
        });

        // Parse enrolledSubjects JSON string
        if (fields.enrolledSubjects) {
          student.enrolledSubjects = JSON.parse(Array.isArray(fields.enrolledSubjects) ? fields.enrolledSubjects[0] : fields.enrolledSubjects);
        }

        // Handle image update if provided
        if (files.image && files.image[0]) {
          const photo = files.image[0];
          let cloudinaryResult;

          try {
            // Upload new image to Cloudinary first
            cloudinaryResult = await cloudinary.uploader.upload(photo.filepath, {
              folder: "school_management/students",
              public_id: `student_${Date.now()}`,
              transformation: [
                { width: 500, height: 500, crop: "limit" },
                { quality: "auto" }
              ]
            });

            // Update student with new image details
            student.studentImg = cloudinaryResult.secure_url;
            student.cloudinaryPublicId = cloudinaryResult.public_id;

            // Delete old image from Cloudinary after successful upload
            if (oldCloudinaryPublicId) {
              try {
                await cloudinary.uploader.destroy(oldCloudinaryPublicId);
                console.log(`Successfully deleted old image: ${oldCloudinaryPublicId}`);
              } catch (deleteError) {
                console.error("Error deleting old image from Cloudinary:", deleteError);
                // Don't fail the request if old image deletion fails
              }
            }

          } catch (cloudinaryError) {
            console.error("Cloudinary upload error:", cloudinaryError);
            return res.status(500).json({
              success: false,
              message: "Image upload failed"
            });
          }
        }

        try {
          await student.save();
          res.status(200).json({
            success: true,
            message: "Student data Updated",
            student: {
              id: student._id,
              name: student.name,
              email: student.email,
              studentImg: student.studentImg,
            },
          });
        } catch (saveError) {
          console.error("Error saving student:", saveError);
          // If save fails and we uploaded a new image, clean it up
          if (files.image && files.image[0] && student.cloudinaryPublicId && student.cloudinaryPublicId !== oldCloudinaryPublicId) {
            try {
              await cloudinary.uploader.destroy(student.cloudinaryPublicId);
            } catch (cleanupError) {
              console.error("Error cleaning up new image after save failure:", cleanupError);
            }
          }
          res.status(500).json({
            success: false,
            message: "Failed to save student data"
          });
        }
      });
    } catch (error) {
      console.error("Update Student error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

  deleteStudentWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;

      const studentToDelete = await Student.findOne({
        _id: id,
        school: schoolId,
      });

      if (!studentToDelete) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Student not found or already deleted",
          });
      }

      // Delete image from Cloudinary if exists
      if (studentToDelete.cloudinaryPublicId) {
        try {
          const cloudinaryResult = await cloudinary.uploader.destroy(studentToDelete.cloudinaryPublicId);
          console.log(`Cloudinary deletion result:`, cloudinaryResult);
          
          if (cloudinaryResult.result === 'ok') {
            console.log(`Successfully deleted image: ${studentToDelete.cloudinaryPublicId}`);
          } else if (cloudinaryResult.result === 'not found') {
            console.log(`Image not found in Cloudinary: ${studentToDelete.cloudinaryPublicId}`);
          } else {
            console.log(`Unexpected Cloudinary result: ${cloudinaryResult.result}`);
          }
        } catch (cloudinaryError) {
          console.error("Cloudinary deletion error:", cloudinaryError);
          // Continue with student deletion even if image deletion fails
          // You might want to log this for manual cleanup later
        }
      }

      // Delete student from database
      const deletedStudent = await Student.findOneAndDelete({
        _id: id,
        school: schoolId,
      });

      if (!deletedStudent) {
        return res.status(404).json({
          success: false,
          message: "Student not found during deletion"
        });
      }

      // Fetch updated list of students
      const students = await Student.find({ school: schoolId }).select(
        "-password -__v -createdAt"
      );
      
      res.status(200).json({ 
        success: true, 
        message: "Student and associated image deleted successfully", 
        students 
      });
    } catch (error) {
      console.error("Delete Student error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
};