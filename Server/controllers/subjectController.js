const mongoose = require('mongoose');
const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");
const Class = require("../models/classModel");
const Exam = require("../models/examinationModel");
const Schedule = require("../models/scheduleModel");

module.exports = {
  getAllSubjects: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const oid = mongoose.Types.ObjectId.createFromHexString(String(schoolId));

      const allSubjects = await Subject.find({ school: schoolId }).lean();

      // Count students enrolled per subject
      const studentCounts = await Student.aggregate([
        { $match: { school: oid } },
        { $unwind: { path: '$enrolledSubjects', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$enrolledSubjects', count: { $sum: 1 } } },
      ]);
      const studentMap = {};
      studentCounts.forEach(({ _id, count }) => { studentMap[String(_id)] = count; });

      // Count classes that include each subject (includedSubjects)
      const classCounts = await Class.aggregate([
        { $match: { school: oid } },
        { $unwind: { path: '$includedSubjects', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$includedSubjects', count: { $sum: 1 } } },
      ]);
      const classMap = {};
      classCounts.forEach(({ _id, count }) => { classMap[String(_id)] = count; });

      const enriched = allSubjects.map(s => ({
        ...s,
        studentCount: studentMap[String(s._id)] || 0,
        classCount: classMap[String(s._id)] || 0,
      }));

      res.status(200).json({ success: true, message: "Fetched all Subjects", data: enriched });
    } catch (error) {
      console.error('getAllSubjects:', error);
      res.status(500).json({ success: false, message: "Server Error in Subject fetching" });
    }
  },

  createSubject: async (req, res) => {
    try {
      const newSubject = new Subject({
        school: req.user.schoolId,
        subjectName: req.body.subjectName,
        subjectCode: req.body.subjectCode,
        subjectFee: req.body.subjectFee || 0,
      });

      await newSubject.save();
      res.status(201).json({ success: true, message: "Subject Created" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server Error in Subject Creation" });
    }
  },

  updateSubjectwithId: async (req, res) => {
    try {
      const id = req.params.id;
      const schoolId = req.user.schoolId;
      await Subject.findOneAndUpdate({ _id: id, school: schoolId }, { $set: { ...req.body } });
      const SubjectAfterUpdate = await Subject.findOne({ _id: id });
      res.status(200).json({ success: true, message: "Subject updated.", data: SubjectAfterUpdate });
    } catch (err) {
      console.error('updateSubjectwithId:', err);
      res.status(500).json({ success: false, message: "Server Error in Subject Updating" });
    }
  },

  deleteSubjectwithId: async (req, res) => {
    try {
      let id = req.params.id;
      let schoolId = req.user.schoolId;

      const SubjectExamCount = (await Exam.find({ subject: id, school: schoolId }))
        .length;
      const SubjectScheduleCount = (
        await Schedule.find({ subject: id, school: schoolId })
      ).length;

      if (
        SubjectExamCount == 0 &&
        SubjectScheduleCount == 0
      ) {
        await Subject.findOneAndDelete({ _id: id, school: schoolId });
        return res
          .status(200)
          .json({ success: true, message: "Subject deleted" });
      } else {
        res
          .status(400)
          .json({ success: false, message: "This Subject is Allocated" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Server Error in Subject deleting" });
    }
  },
};
