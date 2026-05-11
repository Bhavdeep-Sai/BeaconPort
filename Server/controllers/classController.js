const mongoose = require('mongoose');
const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const Exam = require("../models/examinationModel");
const Schedule = require("../models/scheduleModel");
const Teacher = require("../models/teacherModel");

module.exports = {
  getAllClasses: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const allClasses = await Class.find({ school: schoolId })
        .populate('includedSubjects', 'subjectName subjectCode subjectFee')
        .populate('attendee', 'name _id')
        .lean();

      // Count students per class in one aggregation
      const studentCounts = await Student.aggregate([
        { $match: { school: mongoose.Types.ObjectId.createFromHexString(String(schoolId)) } },
        { $group: { _id: '$studentClass', count: { $sum: 1 } } },
      ]);
      const countMap = {};
      studentCounts.forEach(({ _id, count }) => { countMap[String(_id)] = count; });

      const enriched = allClasses.map(c => ({ ...c, studentCount: countMap[String(c._id)] || 0 }));

      res.status(200).json({ success: true, message: 'Fetched all Classes', data: enriched });
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({ success: false, message: 'Server Error in class fetching' });
    }
  },

  getClassWithId: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const classId = req.params.id;

      // Make sure the class exists and belongs to the school
      const selectedClass = await Class.findOne({ 
        school: schoolId, 
        _id: classId 
      }).populate("attendee", "name email"); // Only populate necessary fields

      if (selectedClass) {
        return res.status(200).json({ 
          success: true, 
          message: "Class Data Found", 
          data: selectedClass 
        });
      } else {
        return res.status(404).json({ 
          success: false, 
          message: "Class not found or access denied" 
        });
      }
    } catch (error) {
      console.error("Error fetching class by ID:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error" 
      });
    }
  },

  getAttendeClass: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const attendeeId = req.params.id;

      // Make sure the class exists and belongs to the school
      const selectedClass = await Class.find({ 
        school: schoolId, 
        attendee: req.user.id 
      }); 

      if (selectedClass) {
        return res.status(200).json({ 
          success: true, 
          message: "Class Data Found", 
          data: selectedClass 
        });
      } else {
        return res.status(404).json({ 
          success: false, 
          message: "Class not found or access denied" 
        });
      }
    } catch (error) {
      console.error("Error fetching class by Attendee:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error" 
      });
    }
  },

  createClass: async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.classText || !req.body.classNum) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: classText and classNum are required"
        });
      }

      // Check if a class with the same number already exists in this school
      const existingClass = await Class.findOne({
        school: req.user.schoolId,
        classNum: req.body.classNum
      });

      if (existingClass) {
        return res.status(409).json({
          success: false,
          message: "A class with this number already exists"
        });
      }

      const newClass = new Class({
        school: req.user.schoolId,
        classText: req.body.classText,
        classNum: req.body.classNum,
        classFee: req.body.classFee || 0,
        includedSubjects: req.body.includedSubjects || [],
        attendee: req.body.attendee || null,
      });

      const savedClass = await newClass.save();

      res.status(201).json({ 
        success: true, 
        message: "Class Created",
        data: savedClass
      });
    } catch (err) {
      console.error("Error creating class:", err);
      res.status(500).json({ 
        success: false, 
        message: "Server Error in class Creation" 
      });
    }
  },

  updateClassWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;
      
      // Check if the class exists and belongs to the school
      const existingClass = await Class.findOne({ _id: id, school: schoolId });
      
      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found or access denied"
        });
      }

      // If updating attendee, verify the teacher exists
      if (req.body.attendee) {
        const teacherExists = await Teacher.exists({ 
          _id: req.body.attendee, 
          school: schoolId 
        });
        
        if (!teacherExists) {
          return res.status(400).json({
            success: false,
            message: "Invalid teacher ID provided"
          });
        }
      }
      
      // Update the class
      await Class.findOneAndUpdate(
        { _id: id, school: schoolId }, 
        { $set: req.body },
        { new: false, runValidators: true }
      );
      
      // Fetch the updated class
      const classAfterUpdate = await Class.findOne({ 
        _id: id, 
        school: schoolId 
      })
        .populate("attendee", "name email")
        .populate("includedSubjects", "subjectName subjectCode subjectFee");
      
      res.status(200).json({
        success: true,
        message: "Class updated successfully",
        data: classAfterUpdate,
      });
    } catch (err) {
      console.error("Error updating class:", err);
      res.status(500).json({ 
        success: false, 
        message: "Server Error in class updating", 
        error: err.message 
      });
    }
  },

  deleteClassWithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;

      // Check if the class exists and belongs to the school
      const existingClass = await Class.findOne({ _id: id, school: schoolId });
      
      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found or access denied"
        });
      }

      // Check if the class is being used anywhere
      const classStudentCount = await Student.countDocuments({ 
        studentClass: id, 
        school: schoolId 
      });
      
      const classExamCount = await Exam.countDocuments({ 
        class: id, 
        school: schoolId 
      });
      
      const classScheduleCount = await Schedule.countDocuments({ 
        class: id, 
        school: schoolId 
      });

      if (classStudentCount > 0 || classExamCount > 0 || classScheduleCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete this class as it is currently in use",
          details: {
            students: classStudentCount,
            exams: classExamCount,
            schedules: classScheduleCount
          }
        });
      }

      // Delete the class if not in use
      await Class.findOneAndDelete({ _id: id, school: schoolId });
      
      return res.status(200).json({ 
        success: true, 
        message: "Class deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server Error in class deletion",
        error: error.message
      });
    }
  },
};