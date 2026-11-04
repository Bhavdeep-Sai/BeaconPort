const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
  teacher: { type: mongoose.Schema.ObjectId, ref: 'Teacher', required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // e.g. "January"
  year: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'online', 'cheque'],
    default: null,
  },
  description: { type: String, default: '' },
}, { timestamps: true });

// Prevent duplicate salary slips for the same teacher in the same month and year within a school
salarySchema.index({ school: 1, teacher: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ school: 1, status: 1 });

module.exports = mongoose.model('Salary', salarySchema);
