const express = require('express');
const authMiddleware = require('../auth/auth');
const { createSubject, getAllSubjects, updateSubjectwithId, deleteSubjectwithId } = require('../controllers/subjectController');

const router = express.Router();

router.post('/create',authMiddleware(['SCHOOL']), createSubject);
router.get('/all', authMiddleware(['SCHOOL', 'TEACHER', 'STUDENT']), getAllSubjects);
router.put('/update/:id', authMiddleware(['SCHOOL']), updateSubjectwithId); 
router.delete('/delete/:id', authMiddleware(['SCHOOL']), deleteSubjectwithId); 

module.exports = router;