const express = require('express');
const { registerTeacher, loginTeacher, getTeachersWithQuery, getTeacherOwnData, updateTeacher, deleteTeacherWithId, fetchTeacherWithId } = require('../controllers/teacherController');
const authMiddleware = require('../auth/auth');
const router = express.Router();

router.post('/register', authMiddleware(['SCHOOL']), registerTeacher);
router.post('/login', loginTeacher);
router.get('/fetch-with-query', authMiddleware(['SCHOOL']), getTeachersWithQuery);
router.get('/fetch-single', authMiddleware(['TEACHER']), getTeacherOwnData);
router.get('/fetch/:id', authMiddleware(['SCHOOL']), fetchTeacherWithId);
router.put('/update/:id', authMiddleware(['SCHOOL']), updateTeacher);
router.delete('/delete/:id', authMiddleware(['SCHOOL']), deleteTeacherWithId);

module.exports = router;