const express = require('express');
const { registerStudent, loginStudent, getStudentsWithQuery, getStudentOwnData, updateStudent, deleteStudentWithId, fetchStudentWithId} = require('../controllers/studentController');
const authMiddleware = require('../auth/auth');
const router = express.Router();

router.post('/register', authMiddleware(['SCHOOL']), registerStudent);
router.post('/login', loginStudent);
router.get('/fetch-with-query', authMiddleware(['SCHOOL', 'TEACHER']), getStudentsWithQuery);
router.get('/fetch-single', authMiddleware(['STUDENT']), getStudentOwnData);
router.get('/fetch/:id', authMiddleware(['SCHOOL']), fetchStudentWithId);
router.put('/update/:id', authMiddleware(['SCHOOL']), updateStudent);
router.delete('/delete/:id', authMiddleware(['SCHOOL']), deleteStudentWithId);

module.exports = router;