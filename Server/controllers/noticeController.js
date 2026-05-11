const Notice = require("../models/noticeModel");
const School = require("../models/schoolModel");
const Teacher = require("../models/teacherModel");

module.exports = {
  createNotice: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const { title, message, audience, isImportant, expiryDate } = req.body;

      console.log("User from middleware:", {
        id: req.user._id || req.user.id,
        role: req.user.role,
        schoolId: req.user.schoolId
      });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }

      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: "School ID not found in request",
        });
      }

      // Teachers can only create notices for Students
      if (userRole === "TEACHER" && audience !== "Student") {
        return res.status(403).json({
          success: false,
          message: "Teachers can only create notices for students",
        });
      }

      // Get creator name based on role
      let creatorName;
      if (userRole === "SCHOOL") {
        const school = await School.findById(userId);
        creatorName = school ? school.ownerName : "Unknown School";
      } else if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        creatorName = teacher ? teacher.name : "Unknown Teacher";
      } else {
        creatorName = "Unknown User";
      }

      const noticeData = {
        school: schoolId,
        title,
        message,
        audience,
        isImportant: isImportant || false,
        creatorRole: userRole,
        createdBy: creatorName,
        createdId:userId,
      };

      if (expiryDate) {
        noticeData.expiryDate = expiryDate;
      }

      const newNotice = new Notice(noticeData);
      await newNotice.save();
      
      const populatedNotice = await Notice.findById(newNotice._id)
        .populate("school", "name location");

      res.status(201).json({
        success: true,
        message: "Successfully created Notice",
        data: populatedNotice,
      });
    } catch (error) {
      console.error("Create notice error:", error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          success: false,
          message: "Validation failed",
          errors: validationErrors
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  getAllNotices: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      
      let filter = { school: schoolId };
      const sort = {};

      // Role-based filtering
      if (userRole === "TEACHER") {
        // Get teacher name for filtering
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        // Teachers can see:
        // 1. Notices they created (for students)
        // 2. Notices created by school for teachers
        filter.$or = [
          { 
            createdBy: teacherName,
            audience: "Student" // Only their student notices
          },
          { 
            audience: "Teacher" // All notices for teachers (created by school)
          },
          {
            audience:"All"
          }
        ];
      } else if (userRole === "STUDENT") {
        // Students can see notices targeted to them or all
        filter.$or = [
          { audience: "Student" },
          { audience: "All" }
        ];
      }
      // SCHOOL role can see all notices (no additional filter needed)

      // Apply audience filter if provided
      if (req.query.audience && req.query.audience !== "All") {
        if (userRole === "TEACHER") {
          const teacher = await Teacher.findById(userId);
          const teacherName = teacher ? teacher.name : "Unknown Teacher";
          
          // For teachers, audience filter should work within their permissions
          if (req.query.audience === "Student") {
            // Only their own student notices
            filter = {
              school: schoolId,
              createdBy: teacherName,
              audience: "Student"
            };
          } else if (req.query.audience === "Teacher") {
            // Only notices for teachers
            filter = {
              school: schoolId,
              audience: "Teacher"
            };
          }
        } else if (userRole === "STUDENT") {
          if (req.query.audience === "Student" || req.query.audience === "All") {
            filter.audience = req.query.audience;
          }
        } else {
          filter.audience = req.query.audience;
        }
      }

      // Apply search filter if provided
      if (req.query.search) {
        const searchFilter = {
          $or: [
            { title: { $regex: req.query.search, $options: "i" } },
            { message: { $regex: req.query.search, $options: "i" } },
          ]
        };
        
        // Combine with existing filter
        if (filter.$or) {
          filter = {
            $and: [
              { school: schoolId },
              { $or: filter.$or },
              searchFilter
            ]
          };
        } else {
          Object.assign(filter, searchFilter);
        }
      }

      // Apply importance filter if provided
      if (req.query.important === "true") {
        filter.isImportant = true;
      }

      // Apply date filters if provided
      if (req.query.startDate && req.query.endDate) {
        filter.createdAt = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        };
      } else if (req.query.startDate) {
        filter.createdAt = { $gte: new Date(req.query.startDate) };
      } else if (req.query.endDate) {
        filter.createdAt = { $lte: new Date(req.query.endDate) };
      }

      // Apply sorting
      if (req.query.sortBy) {
        sort[req.query.sortBy] = req.query.sortOrder === "asc" ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      console.log("Final filter for role", userRole, ":", JSON.stringify(filter, null, 2));

      const notices = await Notice.find(filter)
        .populate("school", "name location")
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const totalNotices = await Notice.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: notices,
        pagination: {
          total: totalNotices,
          page,
          limit,
          pages: Math.ceil(totalNotices / limit),
        },
      });
    } catch (error) {
      console.error("Get all notices error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  getNoticeById: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const noticeId = req.params.id;

      if (!noticeId) {
        return res.status(400).json({
          success: false,
          message: "Notice ID is required",
        });
      }

      let filter = { _id: noticeId, school: schoolId };

      // Role-based filtering
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        // Teachers can see notices they created OR notices for teachers
        filter.$or = [
          { 
            createdBy: teacherName,
            audience: "Student"
          },
          { 
            audience: "Teacher"
          }
        ];
      } else if (userRole === "STUDENT") {
        filter.$or = [
          { audience: "Student" },
          { audience: "All" }
        ];
      }

      const notice = await Notice.findOne(filter)
        .populate("school", "name location");

      if (!notice) {
        return res.status(404).json({
          success: false,
          message: "Notice not found or you don't have permission to view it",
        });
      }

      res.status(200).json({ 
        success: true, 
        data: notice 
      });
    } catch (error) {
      console.error("Get notice by ID error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  getNoticesByAudience: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const audience = req.params.audience;

      if (!audience) {
        return res.status(400).json({
          success: false,
          message: "Audience parameter is required",
        });
      }

      let filter = {
        school: schoolId,
        audience: audience,
      };

      // Role-based filtering
      if (userRole === "TEACHER") {
        if (audience === "Student") {
          const teacher = await Teacher.findById(userId);
          const teacherName = teacher ? teacher.name : "Unknown Teacher";
          // Only their own student notices
          filter.createdBy = teacherName;
        } else if (audience === "Teacher") {
          // All notices for teachers
          // No additional filter needed, just audience: "Teacher"
        } else {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to view these notices",
          });
        }
      } else if (userRole === "STUDENT") {
        if (audience !== "Student" && audience !== "All") {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to view these notices",
          });
        }
      }

      const notices = await Notice.find(filter)
        .populate("school", "name location")
        .sort({ createdAt: -1 });

      res.status(200).json({ 
        success: true, 
        data: notices 
      });
    } catch (error) {
      console.error("Get notices by audience error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  updateNoticeWithId: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const noticeId = req.params.id;
      const { title, message, audience, isImportant, expiryDate } = req.body;

      console.log("Update request - User:", {
        userId: userId,
        role: userRole,
        schoolId: schoolId
      });

      if (!noticeId) {
        return res.status(400).json({
          success: false,
          message: "Notice ID is required",
        });
      }

      const existingNotice = await Notice.findOne({ 
        _id: noticeId, 
        school: schoolId 
      });

      if (!existingNotice) {
        return res.status(404).json({
          success: false,
          message: "Notice not found",
        });
      }

      console.log("Existing notice:", {
        id: existingNotice._id,
        createdBy: existingNotice.createdBy,
        audience: existingNotice.audience
      });

      // Check permissions based on user role
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";

        console.log("Permission check:", {
          createdBy: existingNotice.createdBy,
          currentTeacherName: teacherName,
          existingAudience: existingNotice.audience,
          newAudience: audience
        });

        // Teachers can only modify notices they created themselves
        if (existingNotice.createdBy !== teacherName) {
          return res.status(403).json({
            success: false,
            message: "Teachers can only modify notices they created",
          });
        }

        // Ensure the existing notice is for students
        if (existingNotice.audience !== "Student") {
          return res.status(403).json({
            success: false,
            message: "Teachers can only modify student notices",
          });
        }

        // Teachers can only modify notices to be for students
        if (audience && audience !== "Student") {
          return res.status(403).json({
            success: false,
            message: "Teachers can only create/modify notices for students",
          });
        }
      }

      const updateData = {
        title: title || existingNotice.title,
        message: message || existingNotice.message,
        audience: audience || existingNotice.audience,
        isImportant: isImportant !== undefined ? isImportant : existingNotice.isImportant,
        updatedAt: new Date(),
      };

      if (expiryDate !== undefined) {
        updateData.expiryDate = expiryDate;
      }

      console.log("Update data:", updateData);

      const updatedNotice = await Notice.findOneAndUpdate(
        { _id: noticeId, school: schoolId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("school", "name location");

      if (!updatedNotice) {
        return res.status(404).json({
          success: false,
          message: "Notice not found or update failed",
        });
      }

      res.status(200).json({
        success: true,
        message: "Notice details updated",
        data: updatedNotice,
      });
    } catch (error) {
      console.error("Update notice error:", error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          success: false,
          message: "Validation failed",
          errors: validationErrors
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  deleteNoticeWithId: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const noticeId = req.params.id;

      if (!noticeId) {
        return res.status(400).json({
          success: false,
          message: "Notice ID is required",
        });
      }

      const existingNotice = await Notice.findOne({ 
        _id: noticeId, 
        school: schoolId 
      });

      if (!existingNotice) {
        return res.status(404).json({
          success: false,
          message: "Notice not found",
        });
      }

      // Check permissions based on user role
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        // Teachers can only delete notices they created themselves
        if (existingNotice.createdBy !== teacherName) {
          return res.status(403).json({
            success: false,
            message: "Teachers can only delete notices they created",
          });
        }

        // Ensure it's a student notice
        if (existingNotice.audience !== "Student") {
          return res.status(403).json({
            success: false,
            message: "Teachers can only delete student notices",
          });
        }
      }

      await Notice.findOneAndDelete({
        _id: noticeId,
        school: schoolId,
      });

      res.status(200).json({
        success: true,
        message: "Notice deleted successfully",
      });
    } catch (error) {
      console.error("Delete notice error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  batchDeleteNotices: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide an array of notice IDs",
        });
      }

      let deleteFilter = {
        _id: { $in: ids },
        school: schoolId,
      };

      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        deleteFilter.createdBy = teacherName;
        deleteFilter.audience = "Student";
      }

      const result = await Notice.deleteMany(deleteFilter);

      res.status(200).json({
        success: true,
        message: `${result.deletedCount} notices deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Batch delete notices error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  getImportantNotices: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;

      let filter = {
        school: schoolId,
        isImportant: true,
      };

      // Role-based filtering
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        filter.$or = [
          { 
            createdBy: teacherName,
            audience: "Student"
          },
          { 
            audience: "Teacher"
          }
        ];
      } else if (userRole === "STUDENT") {
        filter.$or = [
          { audience: "Student" },
          { audience: "All" }
        ];
      }

      const importantNotices = await Notice.find(filter)
        .populate("school", "name location")
        .sort({ createdAt: -1 });

      res.status(200).json({ 
        success: true, 
        data: importantNotices 
      });
    } catch (error) {
      console.error("Get important notices error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },

  getActiveNotices: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role;
      const currentDate = new Date();

      let filter = {
        school: schoolId,
        expiryDate: { $gte: currentDate },
      };

      // Role-based filtering
      if (userRole === "TEACHER") {
        const teacher = await Teacher.findById(userId);
        const teacherName = teacher ? teacher.name : "Unknown Teacher";
        
        filter.$or = [
          { 
            createdBy: teacherName,
            audience: "Student"
          },
          { 
            audience: "Teacher"
          }
        ];
      } else if (userRole === "STUDENT") {
        filter.$or = [
          { audience: "Student" },
          { audience: "All" }
        ];
      }

      const activeNotices = await Notice.find(filter)
        .populate("school", "name location")
        .sort({ createdAt: -1 });

      res.status(200).json({ 
        success: true, 
        data: activeNotices 
      });
    } catch (error) {
      console.error("Get active notices error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal Server Error" 
      });
    }
  },
};