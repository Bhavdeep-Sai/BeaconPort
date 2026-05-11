const express = require('express');
const authMiddleware = require('../auth/auth');
const { createSalary, getAllSalaries, updateSalary, deleteSalary, getSalaryStats, getMySalary } = require('../controllers/salaryController');

const router = express.Router();

router.get('/my',          authMiddleware(['TEACHER']), getMySalary);
router.post('/create',     authMiddleware(['SCHOOL']),  createSalary);
router.get('/all',         authMiddleware(['SCHOOL']),  getAllSalaries);
router.put('/update/:id',  authMiddleware(['SCHOOL']),  updateSalary);
router.delete('/delete/:id', authMiddleware(['SCHOOL']), deleteSalary);
router.get('/stats',       authMiddleware(['SCHOOL']),  getSalaryStats);

module.exports = router;
