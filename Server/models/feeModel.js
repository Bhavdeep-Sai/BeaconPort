const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  school:   { type: mongoose.Schema.ObjectId, ref: 'School',  required: true },
  student:  { type: mongoose.Schema.ObjectId, ref: 'Student', required: true },
  class:    { type: mongoose.Schema.ObjectId, ref: 'Class',   required: true },
  amount:   { type: Number, required: true },
  // term key: 'H1'|'H2' (half-yearly)  'Q1'-'Q4' (quarterly)  month name (monthly)  'Annual'
  term:      { type: String, required: true },
  year:      { type: Number, required: true },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'annual'], required: true },
  dueDate:  { type: Date, required: true },
  paidDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending',
  },
  paidAmount: { type: Number, default: null },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'online', 'cheque'],
    default: null,
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

// One fee record per student per term per year
feeSchema.index({ school: 1, student: 1, term: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Fee', feeSchema);

