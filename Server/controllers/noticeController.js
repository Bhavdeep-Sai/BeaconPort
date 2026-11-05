const noticeService = require("../services/noticeService");
const asyncHandler = require("../utils/asyncHandler");

const noticeController = {
  createNotice: asyncHandler(async (req, res) => {
    const notice = await noticeService.createNotice({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Successfully created Notice",
      data: notice,
    });
  }),

  getAllNotices: asyncHandler(async (req, res) => {
    const { notices, pagination } = await noticeService.getAllNotices({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      query: req.query,
    });

    res.status(200).json({
      success: true,
      data: notices,
      pagination,
    });
  }),

  getNoticeById: asyncHandler(async (req, res) => {
    const notice = await noticeService.getNoticeById({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      noticeId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: notice,
    });
  }),

  getNoticesByAudience: asyncHandler(async (req, res) => {
    const notices = await noticeService.getNoticesByAudience({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      audience: req.params.audience,
    });

    res.status(200).json({
      success: true,
      data: notices,
    });
  }),

  updateNoticeWithId: asyncHandler(async (req, res) => {
    const updatedNotice = await noticeService.updateNotice({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      noticeId: req.params.id,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "Notice details updated",
      data: updatedNotice,
    });
  }),

  deleteNoticeWithId: asyncHandler(async (req, res) => {
    await noticeService.deleteNotice({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      noticeId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  }),

  batchDeleteNotices: asyncHandler(async (req, res) => {
    const deletedCount = await noticeService.batchDeleteNotices({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      ids: req.body.ids,
    });

    res.status(200).json({
      success: true,
      message: `${deletedCount} notices deleted successfully`,
      deletedCount,
    });
  }),

  getImportantNotices: asyncHandler(async (req, res) => {
    const importantNotices = await noticeService.getImportantNotices({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      data: importantNotices,
    });
  }),

  getActiveNotices: asyncHandler(async (req, res) => {
    const activeNotices = await noticeService.getActiveNotices({
      schoolId: req.user.schoolId,
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      data: activeNotices,
    });
  }),
};

module.exports = noticeController;
