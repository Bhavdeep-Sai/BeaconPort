const express = require('express');
const authMiddleware = require('../auth/auth');
const {
  getFeeSettings, updateFeeSettings,
  getOverview, bulkGenerateFees,
  quickPay, quickUnpay, updateStatus,
  deleteFee, getFeeStats, getAllFees,
} = require('../controllers/feeController');

const router = express.Router();

router.get('/settings',        authMiddleware(['SCHOOL']), getFeeSettings);
router.put('/settings',        authMiddleware(['SCHOOL']), updateFeeSettings);
router.get('/overview',        authMiddleware(['SCHOOL']), getOverview);
router.post('/bulk-generate',  authMiddleware(['SCHOOL']), bulkGenerateFees);
router.put('/quick-pay/:id',    authMiddleware(['SCHOOL']), quickPay);
router.put('/quick-unpay/:id',  authMiddleware(['SCHOOL']), quickUnpay);
router.put('/update-status/:id', authMiddleware(['SCHOOL']), updateStatus);
router.delete('/delete/:id',   authMiddleware(['SCHOOL']), deleteFee);
router.get('/stats',           authMiddleware(['SCHOOL']), getFeeStats);
router.get('/all',             authMiddleware(['SCHOOL']), getAllFees);

module.exports = router;

