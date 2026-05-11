const express = require('express');
const authMiddleware = require('../auth/auth');
const { 
  markAttendance, 
  markBulkAttendance, 
  getAttendance, 
  getBulkAttendance, 
  checkAttendance 
} = require('../controllers/attendanceController');
const router = express.Router();
router.post('/mark', authMiddleware(['TEACHER']), markAttendance);
router.post('/mark-bulk', authMiddleware(['TEACHER']), markBulkAttendance);
router.get('/check/:classId', authMiddleware(['SCHOOL', 'TEACHER']), checkAttendance); 
router.get('/:id', authMiddleware(['SCHOOL', 'TEACHER', 'STUDENT']), getAttendance);
router.post('/bulk', authMiddleware(['SCHOOL', 'TEACHER']), getBulkAttendance);

module.exports = router;