const express = require("express");
const authMiddleware = require("../auth/auth");
const router = express.Router();

const {
    createNotice,
    getAllNotices,
    getNoticeById,
    getNoticesByAudience,
    updateNoticeWithId,
    deleteNoticeWithId,
    batchDeleteNotices,
    getImportantNotices,
    getActiveNotices,
} = require("../controllers/noticeController");


router.get("/all", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), getAllNotices);
router.get("/important", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), getImportantNotices);
router.get("/active", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), getActiveNotices);
router.get("/audience/:audience", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), getNoticesByAudience);
router.get("/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), getNoticeById);

router.post("/create", authMiddleware(["SCHOOL", "TEACHER"]), createNotice);
router.put("/:id", authMiddleware(["SCHOOL", "TEACHER"]), updateNoticeWithId);
router.delete("/:id", authMiddleware(["SCHOOL", "TEACHER"]), deleteNoticeWithId);
router.post("/batch-delete", authMiddleware(["SCHOOL", "TEACHER"]), batchDeleteNotices);

module.exports = router;