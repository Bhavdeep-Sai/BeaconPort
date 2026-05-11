const Salary = require('../models/salaryModel');

module.exports = {
  // POST /api/salary/create
  createSalary: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { teacherId, amount, month, year, dueDate, paidDate, status, paymentMethod, description } = req.body;

      if (!teacherId || !amount || !month || !year || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: teacherId, amount, month, year, dueDate',
        });
      }

      // Check for duplicate salary record for same teacher/month/year
      const existing = await Salary.findOne({ school: schoolId, teacher: teacherId, month, year });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Salary record for this teacher for ${month} ${year} already exists`,
        });
      }

      const salary = new Salary({
        school: schoolId,
        teacher: teacherId,
        amount,
        month,
        year,
        dueDate: new Date(dueDate),
        paidDate: paidDate ? new Date(paidDate) : null,
        status: status || 'pending',
        paymentMethod: paymentMethod || null,
        description: description || '',
      });

      if (salary.status !== 'paid') {
        salary.paidDate = null;
        salary.paymentMethod = paymentMethod || null;
      } else if (!salary.paidDate) {
        salary.paidDate = new Date();
      }

      await salary.save();

      const populated = await Salary.findById(salary._id)
        .populate('teacher', 'name email teacherImg');

      return res.status(201).json({
        success: true,
        message: 'Salary record created successfully',
        salary: populated,
      });
    } catch (error) {
      console.error('createSalary error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/salary/all
  getAllSalaries: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { teacherId, status, month, year } = req.query;

      const filter = { school: schoolId };
      if (teacherId) filter.teacher = teacherId;
      if (status) filter.status = status;
      if (month) filter.month = month;
      if (year) filter.year = Number(year);

      const salaries = await Salary.find(filter)
        .populate('teacher', 'name email teacherImg')
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, salaries });
    } catch (error) {
      console.error('getAllSalaries error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // PUT /api/salary/update/:id
  updateSalary: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { id } = req.params;
      const { amount, month, year, dueDate, paidDate, status, paymentMethod, description, teacherId } = req.body;

      const salary = await Salary.findOne({ _id: id, school: schoolId });
      if (!salary) {
        return res.status(404).json({ success: false, message: 'Salary record not found' });
      }

      if (amount !== undefined) salary.amount = amount;
      if (month !== undefined) salary.month = month;
      if (year !== undefined) salary.year = Number(year);
      if (dueDate !== undefined) salary.dueDate = new Date(dueDate);
      if (paidDate !== undefined) salary.paidDate = paidDate ? new Date(paidDate) : null;
      if (status !== undefined) salary.status = status;
      if (paymentMethod !== undefined) salary.paymentMethod = paymentMethod;
      if (description !== undefined) salary.description = description;
      if (teacherId !== undefined) salary.teacher = teacherId;

      await salary.save();

      const populated = await Salary.findById(salary._id)
        .populate('teacher', 'name email teacherImg');

      return res.status(200).json({ success: true, message: 'Salary updated successfully', salary: populated });
    } catch (error) {
      console.error('updateSalary error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /api/salary/delete/:id
  deleteSalary: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { id } = req.params;

      const salary = await Salary.findOneAndDelete({ _id: id, school: schoolId });
      if (!salary) {
        return res.status(404).json({ success: false, message: 'Salary record not found' });
      }

      return res.status(200).json({ success: true, message: 'Salary record deleted successfully' });
    } catch (error) {
      console.error('deleteSalary error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/salary/my  (TEACHER: see own salary records)
  getMySalary: async (req, res) => {
    try {
      const { id: teacherId, schoolId } = req.user;
      const { month, year, status } = req.query;

      const filter = { teacher: teacherId, school: schoolId };
      if (month)  filter.month  = month;
      if (year)   filter.year   = Number(year);
      if (status) filter.status = status;

      const salaries = await Salary.find(filter).sort({ year: -1, createdAt: -1 });

      return res.status(200).json({ success: true, salaries });
    } catch (error) {
      console.error('getMySalary error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/salary/stats
  getSalaryStats: async (req, res) => {
    try {
      const { schoolId } = req.user;
      const { month, year } = req.query;

      const filter = { school: schoolId };
      if (month) filter.month = month;
      if (year) filter.year = Number(year);

      const stats = await Salary.aggregate([
        { $match: { ...filter, school: require('mongoose').Types.ObjectId.createFromHexString(schoolId) } },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      const result = { paid: 0, pending: 0, overdue: 0, totalRecords: 0 };
      stats.forEach((s) => {
        result[s._id] = s.totalAmount;
        result.totalRecords += s.count;
      });

      return res.status(200).json({ success: true, stats: result });
    } catch (error) {
      console.error('getSalaryStats error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};
