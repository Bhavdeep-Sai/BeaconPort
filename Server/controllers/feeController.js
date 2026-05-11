const Fee = require('../models/feeModel');
const Student = require('../models/studentModel');
const School = require('../models/schoolModel');
const Subject = require('../models/subjectModel');
const mongoose = require('mongoose');

// Helper: classFee + sum of enrolled subject fees that are NOT included in the class
const calcTotalFee = (student) => {
  const cls = student.studentClass;
  const classFee = cls ? (cls.classFee || 0) : 0;
  const includedIds = new Set((cls?.includedSubjects || []).map(id => String(id)));
  const subjectFees = (student.enrolledSubjects || []).reduce((sum, s) => {
    if (includedIds.has(String(s._id))) return sum; // free for this class
    return sum + (s.subjectFee || 0);
  }, 0);
  return classFee + subjectFees;
};

module.exports = {
  // GET /fee/settings
  getFeeSettings: async (req, res) => {
    try {
      const school = await School.findById(req.user.schoolId).select('feeFrequency');
      return res.json({ success: true, feeFrequency: school?.feeFrequency || 'half-yearly' });
    } catch (err) {
      console.error('getFeeSettings:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /fee/settings  body: { feeFrequency }
  updateFeeSettings: async (req, res) => {
    try {
      const { feeFrequency } = req.body;
      if (!['monthly', 'quarterly', 'half-yearly', 'annual'].includes(feeFrequency)) {
        return res.status(400).json({ success: false, message: 'Invalid frequency' });
      }
      await School.findByIdAndUpdate(req.user.schoolId, { feeFrequency });
      return res.json({ success: true, message: 'Fee settings updated' });
    } catch (err) {
      console.error('updateFeeSettings:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /fee/overview?term=H1&year=2026&classId=&status=
  getOverview: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { term, year, classId, status } = req.query;

      if (term && year) {
        await Fee.updateMany(
          { school: schoolId, term, year: Number(year), status: 'pending', dueDate: { $lt: new Date() } },
          { $set: { status: 'overdue' } }
        );
      }

      const studentFilter = { school: schoolId };
      if (classId) studentFilter.studentClass = classId;

      const students = await Student.find(studentFilter)
        .select('name email studentImg studentClass enrolledSubjects')
        .populate({ path: 'studentClass', select: 'classText classFee includedSubjects' })
        .populate('enrolledSubjects', 'subjectName subjectFee')
        .sort({ name: 1 });

      const studentIds = students.map(s => s._id);

      const feeFilter = { school: schoolId, student: { $in: studentIds } };
      if (term) feeFilter.term = term;
      if (year) feeFilter.year = Number(year);

      const fees = await Fee.find(feeFilter).lean();
      const feeMap = {};
      fees.forEach(f => { feeMap[String(f.student)] = f; });

      let result = students.map(s => {
        const totalFee = calcTotalFee(s);
        return {
          student: { _id: s._id, name: s.name, email: s.email, studentImg: s.studentImg },
          class: s.studentClass
            ? { _id: s.studentClass._id, classText: s.studentClass.classText, classFee: s.studentClass.classFee, includedSubjects: (s.studentClass.includedSubjects || []).map(id => String(id)) }
            : null,
          subjects: (s.enrolledSubjects || []).map(sub => ({ _id: sub._id, subjectName: sub.subjectName, subjectFee: sub.subjectFee })),
          totalFee,
          fee: feeMap[String(s._id)] || null,
        };
      });

      // Auto-sync: if the total fee (class + subjects) changed, update pending/overdue records immediately.
      const staleRecords = result.filter(r =>
        r.fee &&
        ['pending', 'overdue'].includes(r.fee.status) &&
        r.fee.amount !== r.totalFee
      );
      if (staleRecords.length) {
        Promise.all(staleRecords.map(r =>
          Fee.updateOne({ _id: r.fee._id }, { $set: { amount: r.totalFee } })
        )).catch(() => {});
        const staleMap = new Map(staleRecords.map(r => [String(r.fee._id), r.totalFee]));
        result = result.map(r => {
          if (r.fee && staleMap.has(String(r.fee._id))) {
            return { ...r, fee: { ...r.fee, amount: staleMap.get(String(r.fee._id)) } };
          }
          return r;
        });
      }

      if (status) {
        result = result.filter(r =>
          status === 'no-record' ? !r.fee : r.fee?.status === status
        );
      }

      return res.json({ success: true, overview: result });
    } catch (err) {
      console.error('getOverview:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /fee/bulk-generate
  bulkGenerateFees: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { term, year, dueDate, frequency, classId, studentIds } = req.body;

      if (!term || !year || !dueDate || !frequency) {
        return res.status(400).json({ success: false, message: 'term, year, dueDate, frequency are required' });
      }

      const studentFilter = { school: schoolId };
      if (classId) studentFilter.studentClass = classId;
      if (studentIds && studentIds.length) studentFilter._id = { $in: studentIds };

      const students = await Student.find(studentFilter)
        .populate({ path: 'studentClass', select: 'classFee includedSubjects' })
        .populate('enrolledSubjects', 'subjectFee');

      let created = 0, skipped = 0, updated = 0;
      const createdFees = [];
      
      await Promise.all(students.map(async (student) => {
        const currentFee = calcTotalFee(student);
        const existing = await Fee.findOne({ school: schoolId, student: student._id, term, year: Number(year) });
        if (existing) {
          // Sync amount if class fee changed and record hasn't been paid yet
          if (['pending', 'overdue'].includes(existing.status) && existing.amount !== currentFee) {
            await Fee.updateOne({ _id: existing._id }, { $set: { amount: currentFee } });
            updated++;
          } else {
            skipped++;
          }
          return;
        }
        const newFee = await Fee.create({
          school:    schoolId,
          student:   student._id,
          class:     student.studentClass ? student.studentClass._id : null,
          amount:    currentFee,
          term,
          year:      Number(year),
          frequency,
          dueDate:   new Date(dueDate),
          status:    'pending',
        });
        createdFees.push({
          id: newFee._id,
          student: student.name,
          term,
          year,
          frequency,
        });
        created++;
      }));

      return res.json({
        success: true,
        message: `Generated ${created}, updated ${updated}, skipped ${skipped} fee record(s)`,
        created,
        updated,
        skipped,
      });
    } catch (err) {
      console.error('bulkGenerateFees error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /fee/quick-pay/:id
  quickPay: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const fee = await Fee.findOne({ _id: req.params.id, school: schoolId });
      if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

      fee.status = 'paid';
      fee.paidDate = new Date();
      if (req.body.paymentMethod) fee.paymentMethod = req.body.paymentMethod;
      await fee.save();

      return res.json({ success: true, message: 'Fee marked as paid', fee });
    } catch (err) {
      console.error('quickPay:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /fee/quick-unpay/:id
  quickUnpay: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const fee = await Fee.findOne({ _id: req.params.id, school: schoolId });
      if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

      fee.status = 'pending';
      fee.paidDate = null;
      fee.paymentMethod = null;
      await fee.save();

      return res.json({ success: true, message: 'Fee reverted to pending', fee });
    } catch (err) {
      console.error('quickUnpay:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /fee/delete/:id
  deleteFee: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const fee = await Fee.findOneAndDelete({ _id: req.params.id, school: schoolId });
      if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
      return res.json({ success: true, message: 'Fee record deleted' });
    } catch (err) {
      console.error('deleteFee:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /fee/update-status/:id  body: { status, paymentMethod?, paidAmount? }
  updateStatus: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { status, paymentMethod, paidAmount } = req.body;
      
      if (!['pending', 'paid', 'overdue', 'partial'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const fee = await Fee.findOne({ _id: req.params.id, school: schoolId });
      if (!fee) {
        return res.status(404).json({ success: false, message: 'Fee record not found' });
      }

      fee.status = status;
      if (status === 'paid' || status === 'partial') {
        if (paymentMethod) fee.paymentMethod = paymentMethod;
        fee.paidDate = fee.paidDate || new Date();
        if (status === 'partial' && paidAmount != null) {
          const previousPaidAmount = Number(fee.paidAmount || 0);
          const incomingPaidAmount = Number(paidAmount);
          const nextPaidAmount = previousPaidAmount + (Number.isFinite(incomingPaidAmount) ? incomingPaidAmount : 0);
          fee.paidAmount = Math.min(nextPaidAmount, fee.amount);
          if (fee.paidAmount >= fee.amount) {
            fee.status = 'paid';
          }
        } else if (status === 'paid') {
          fee.paidAmount = fee.amount;
        }
      } else {
        fee.paidDate = null;
        fee.paidAmount = null;
        fee.paymentMethod = null;
      }

      await fee.save();
      
      // Fetch fresh copy to verify save
      const saved = await Fee.findById(req.params.id);
      return res.json({ success: true, message: 'Payment status updated', fee: saved });
    } catch (err) {
      console.error('❌ updateStatus error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /fee/stats?term=H1&year=2026
  getFeeStats: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { term, year } = req.query;

      const match = { school: mongoose.Types.ObjectId.createFromHexString(schoolId) };
      if (term) match.term = term;
      if (year) match.year = Number(year);

      const stats = await Fee.aggregate([
        { $match: match },
        { $group: { _id: '$status', totalAmount: { $sum: { $cond: [ { $ifNull: ['$paidAmount', false] }, '$paidAmount', '$amount' ] } }, count: { $sum: 1 } } },
      ]);

      const result = {
        paid: 0,
        partial: 0,
        pending: 0,
        overdue: 0,
        paidAmt: 0,
        partialAmt: 0,
        pendingAmt: 0,
        overdueAmt: 0,
        totalRecords: 0,
      };
      stats.forEach(s => {
        result[s._id] = s.count;
        result[s._id + 'Amt'] = s.totalAmount;
        result.totalRecords += s.count;
      });

      return res.json({ success: true, stats: result });
    } catch (err) {
      console.error('getFeeStats:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /fee/all  (list all fee records for school, optional filters)
  getAllFees: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { studentId, status, term, year } = req.query;

      const filter = { school: schoolId };
      if (studentId) filter.student = studentId;
      if (status) filter.status = status;
      if (term) filter.term = term;
      if (year) filter.year = Number(year);

      const fees = await Fee.find(filter)
        .populate('student', 'name email studentImg createdAt')
        .populate('class', 'classText classFee')
        .sort({ year: -1, term: 1, createdAt: -1 });

      return res.status(200).json({ success: true, fees });
    } catch (err) {
      console.error('getAllFees:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};