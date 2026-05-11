const mongoose = require("mongoose");

const examinationSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },
  examDate: {
    type: Date,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true
  },
  examType: {
    type: String,
    required: true,
    enum: [
      
      'Mid Term', 'Final Term', 'Annual Exam','Unit Test','Semester Exam',
      
      'Quiz', 'Class Test','Weekly Test', 'Slip Test'
    ]
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },
  startTime: {
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  duration: {
    type: Number, 
    required: true,
    min: [1, 'Duration must be at least 1 minute']
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    required: true,
    enum: ['School', 'Teacher']
  },
  
  creatorRole: {
    type: String,
    required: true,
    enum: ['SCHOOL', 'TEACHER']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


examinationSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});


examinationSchema.pre("save", function(next) {
  const startTime = new Date(`1970-01-01T${this.startTime}`);
  const endTime = new Date(`1970-01-01T${this.endTime}`);
  
  if (endTime <= startTime) {
    const error = new Error('End time must be after start time');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});


examinationSchema.index({ school: 1, class: 1 });
examinationSchema.index({ createdBy: 1, creatorRole: 1 });
examinationSchema.index({ examDate: 1 });
examinationSchema.index({ school: 1, examDate: 1 });

module.exports = mongoose.model("Examination", examinationSchema);