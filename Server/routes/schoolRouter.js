const express = require('express');
const { 
    registerSchool, 
    getAllSchools, 
    loginSchool, 
    updateSchool, 
    getSchoolOwnData,
    registerSchoolGoogle,
    loginSchoolGoogle,
    forgotPassword,
    resetPassword,
    verifyResetToken
} = require('../controllers/schoolController');
const authMiddleware = require('../auth/auth');
const router = express.Router();


router.post('/register', registerSchool);
router.post('/login', loginSchool);
router.post('/register/google', registerSchoolGoogle);
router.post('/login/oauth', loginSchoolGoogle); 
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/all', getAllSchools);
router.put('/update', authMiddleware(['SCHOOL']), updateSchool);
router.get('/fetch-single', authMiddleware(['SCHOOL']), getSchoolOwnData);

module.exports = router;