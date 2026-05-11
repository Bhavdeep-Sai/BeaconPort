const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");
const Exam = require("../models/examinationModel");
const Schedule = require("../models/scheduleModel");
const Teacher = require("../models/teacherModel");

module.exports = {
  getSchedulewithClass: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const classId = req.params.id;
      
      // Update status of completed schedules before fetching
      await updateScheduleStatuses(schoolId);
      
      const schedules = await Schedule.find({
        school: schoolId,
        class: classId,
        status: { $ne: 'completed' } // Don't show completed schedules
      })
      .populate('teacher', 'name')
      .populate('subject', 'subjectName')
      .sort({ startTime: 1 }); // Sort by start time

      res.status(200).json({
        success: true,
        message: "Fetched all schedules",
        data: schedules,
      });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res
        .status(500)
        .json({ success: false, message: "Server Error in Schedule fetching" });
    }
  },

  getScheduleById: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const scheduleId = req.params.id;
      
      const schedule = await Schedule.findOne({
        _id: scheduleId,
        school: schoolId
      })
      .populate('teacher', 'name')
      .populate('subject', 'subjectName')
      .populate('class', 'classText');

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found"
        });
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error("Error fetching schedule by ID:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in fetching schedule"
      });
    }
  },

  createSchedule: async (req, res) => {
    try {
      const { teacher, subject, selectedClass, startTime, endTime, date } = req.body;
      
      console.log("Schedule creation data:", {
        teacher, 
        subject, 
        class: selectedClass, 
        date,
        startTime, 
        endTime
      });
      
      // Check if all required fields are present
      if (!teacher || !subject || !selectedClass || !startTime || !endTime || !date) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields for schedule creation"
        });
      }
      
      // Format date strings - ensure they're in a format JavaScript can parse
      let formattedStartTime, formattedEndTime;
      
      try {
        // Convert input strings to ISO format dates
        formattedStartTime = new Date(`${date}T${startTime}`);
        formattedEndTime = new Date(`${date}T${endTime}`);
        
        // Validate that dates are valid
        if (isNaN(formattedStartTime.getTime()) || isNaN(formattedEndTime.getTime())) {
          throw new Error("Invalid date format");
        }
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD for date and HH:MM for time"
        });
      }
      
      // Check if the schedule is already in the past
      const now = new Date();
      if (formattedEndTime < now) {
        return res.status(400).json({
          success: false,
          message: "Cannot create schedule in the past"
        });
      }
      
      // Determine initial status
      let status = 'active';
      
      const newSchedule = new Schedule({
        school: req.user.schoolId,
        teacher,
        subject,
        class: selectedClass,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        status
      });

      await newSchedule.save();

      res.status(201).json({ 
        success: true, 
        message: "Schedule Created",
        data: newSchedule 
      });
    } catch (err) {
      console.error("Error creating schedule:", err);
      res
        .status(500)
        .json({ 
          success: false, 
          message: "Server Error in Schedule Creation",
          error: err.message
        });
    }
  },

  updateScheduleWithId: async (req, res) => {
    try {
      let id = req.params.id;
      const schoolId = req.user.schoolId;
      const { startTime, endTime, date, status, ...otherData } = req.body;
      
      // First check if schedule exists and belongs to this school
      const existingSchedule = await Schedule.findOne({ 
        _id: id, 
        school: schoolId 
      });
      
      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found or you don't have permission to update it"
        });
      }
      
      // Prevent updates to completed schedules
      if (existingSchedule.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: "Cannot update a completed schedule"
        });
      }
      
      let updateData = { ...otherData };
      
      // Update status if provided
      if (status && ['active', 'cancelled'].includes(status)) {
        updateData.status = status;
      }
      
      // If we have date and time information, update the datetime fields
      if (date && startTime) {
        try {
          const formattedStartTime = new Date(`${date}T${startTime}`);
          if (!isNaN(formattedStartTime.getTime())) {
            updateData.startTime = formattedStartTime;
          }
        } catch (error) {
          console.error("Error parsing start time:", error);
          return res.status(400).json({
            success: false,
            message: "Invalid start time format"
          });
        }
      }
      
      if (date && endTime) {
        try {
          const formattedEndTime = new Date(`${date}T${endTime}`);
          if (!isNaN(formattedEndTime.getTime())) {
            updateData.endTime = formattedEndTime;
          }
        } catch (error) {
          console.error("Error parsing end time:", error);
          return res.status(400).json({
            success: false,
            message: "Invalid end time format"
          });
        }
      }
      
      // Validate that start time is before end time
      const finalStartTime = updateData.startTime || existingSchedule.startTime;
      const finalEndTime = updateData.endTime || existingSchedule.endTime;
      
      if (finalStartTime >= finalEndTime) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time"
        });
      }
      
      await Schedule.findOneAndUpdate(
        { _id: id, school: schoolId }, 
        { $set: updateData }
      );
      
      const scheduleAfterUpdate = await Schedule.findOne({ _id: id })
        .populate('teacher', 'name')
        .populate('subject', 'subjectName');
        
      res.status(200).json({
        success: true,
        message: "Schedule updated",
        data: scheduleAfterUpdate,
      });
    } catch (err) {
      console.error("Error updating schedule:", err);
      res
        .status(500)
        .json({ success: false, message: "Server Error in Schedule Updating" });
    }
  },

  deleteScheduleWithId: async (req, res) => {
    try {
      let id = req.params.id;
      let schoolId = req.user.schoolId;

      // First check if schedule exists and belongs to this school
      const existingSchedule = await Schedule.findOne({ 
        _id: id, 
        school: schoolId 
      });
      
      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found or you don't have permission to delete it"
        });
      }
      
      // Prevent deletion of completed schedules (optional, based on requirements)
      if (existingSchedule.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: "Cannot delete a completed schedule"
        });
      }

      const deletedSchedule = await Schedule.findOneAndDelete({ _id: id, school: schoolId });
      
      res.status(200).json({ 
        success: true, 
        message: "Schedule deleted",
        data: deletedSchedule._id
      });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res
        .status(500)
        .json({ success: false, message: "Server Error in Schedule deleting" });
    }
  },
  
  // Helper function to update schedule statuses (called by other endpoints)
  cleanupCompletedSchedules: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const result = await updateScheduleStatuses(schoolId);
      
      res.status(200).json({
        success: true,
        message: "Completed schedules updated",
        completedCount: result.completedCount,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error("Error cleaning up schedules:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in schedule cleanup"
      });
    }
  },

  // Updated function to get subjects for a teacher
  getTeacherSubjects: async (req, res) => {
    try {
      const teacherId = req.params.teacherId;
      const schoolId = req.user.schoolId;
      
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }
      
      // Find the teacher to get their assigned subjects
      const teacher = await Teacher.findOne({
        _id: teacherId,
        school: schoolId
      }).populate('subjects');
      
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }
      
      // Check if teacher has subjects assigned
      if (teacher.subjects && teacher.subjects.length > 0) {
        return res.status(200).json({
          success: true,
          subjects: teacher.subjects
        });
      } else {
        // If no subjects are assigned, return an empty array
        return res.status(200).json({
          success: true,
          subjects: []
        });
      }
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      res.status(500).json({
        success: false,
        message: "Server error in fetching teacher subjects"
      });
    }
  }
};

// Helper function to update schedule statuses
async function updateScheduleStatuses(schoolId) {
  const now = new Date();
  
  // Find schedules that have ended but are still marked as active
  const result = await Schedule.updateMany(
    {
      school: schoolId,
      status: 'active',
      endTime: { $lt: now }
    },
    {
      $set: { status: 'completed' }
    }
  );
  
  // Optional: Delete completed schedules older than X days (e.g., 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const deleteResult = await Schedule.deleteMany({
    school: schoolId,
    status: 'completed',
    endTime: { $lt: thirtyDaysAgo }
  });
  
  return {
    completedCount: result.modifiedCount,
    deletedCount: deleteResult.deletedCount
  };
}