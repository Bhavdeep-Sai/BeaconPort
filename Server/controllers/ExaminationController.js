const examinationService = require("../services/examinationService");
const asyncHandler = require("../utils/asyncHandler");

const ExaminationController = {
  createExamination: asyncHandler(async (req, res) => {
    const { role, schoolId, id } = req.user;
    const {
      date,
      subjectId,
      examType,
      classId,
      startTime,
      endTime,
      duration,
    } = req.body;

    const populatedExam = await examinationService.createExamination({
      role,
      schoolId,
      id,
      date,
      subjectId,
      examType,
      classId,
      startTime,
      endTime,
      duration,
    });

    res.status(201).json({
      success: true,
      message: "Successfully created Exam",
      data: populatedExam,
    });
  }),

  getAllExamination: asyncHandler(async (req, res) => {
    const { role, schoolId, id } = req.user;
    const activeExaminations = await examinationService.getAllExaminations({
      role,
      schoolId,
      id,
    });

    res.status(200).json({
      success: true,
      data: activeExaminations,
      count: activeExaminations.length,
    });
  }),

  getExaminationByClass: asyncHandler(async (req, res) => {
    const { role, schoolId, id } = req.user;
    const classId = req.params.id;

    const activeClassExaminations =
      await examinationService.getExaminationByClass({
        role,
        schoolId,
        id,
        classId,
      });

    res.status(200).json({
      success: true,
      data: activeClassExaminations,
      count: activeClassExaminations.length,
    });
  }),

  updateExaminationWithId: asyncHandler(async (req, res) => {
    const { role, schoolId, id } = req.user;
    const examId = req.params.id;

    const updatedExam = await examinationService.updateExamination({
      role,
      schoolId,
      id,
      examId,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "Examination details updated successfully",
      data: updatedExam,
    });
  }),

  deleteExaminationWithId: asyncHandler(async (req, res) => {
    const { role, schoolId, id } = req.user;
    const examId = req.params.id;

    await examinationService.deleteExamination({
      role,
      schoolId,
      id,
      examId,
    });

    res.status(200).json({
      success: true,
      message: "Examination deleted successfully",
    });
  }),

  calculateDuration: asyncHandler(async (req, res) => {
    const { startTime, endTime } = req.body;
    const result = examinationService.calculateDuration(startTime, endTime);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.status(200).json({
      success: true,
      data: { duration: result.duration },
    });
  }),

  getAvailableExamTypes: asyncHandler(async (req, res) => {
    const { role } = req.user;
    const availableTypes = examinationService.getAvailableExamTypes(role);

    res.status(200).json({
      success: true,
      data: availableTypes,
    });
  }),
};

module.exports = ExaminationController;
