const express = require('express');
const authMiddleware = require('../auth/auth');
const { 
  createExamination, 
  getAllExamination, 
  getExaminationByClass, 
  updateExaminationWithId,
  deleteExaminationWithId, 
  calculateDuration,
  getAvailableExamTypes
} = require('../controllers/ExaminationController');

const router = express.Router();
router.post('/create', authMiddleware(['TEACHER', 'SCHOOL']), createExamination);
router.get('/all', authMiddleware(['SCHOOL', 'TEACHER', 'STUDENT']), getAllExamination); 
router.get('/class/:id', authMiddleware(['SCHOOL', 'TEACHER', 'STUDENT']), getExaminationByClass);
router.put('/update/:id', authMiddleware(['SCHOOL', 'TEACHER']), updateExaminationWithId);
router.delete('/delete/:id', authMiddleware(['SCHOOL', 'TEACHER']), deleteExaminationWithId);
router.post('/calculate-duration', authMiddleware(['SCHOOL', 'TEACHER']), calculateDuration);
router.get('/exam-types', authMiddleware(['SCHOOL', 'TEACHER', 'STUDENT']), getAvailableExamTypes);

module.exports = router;