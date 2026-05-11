const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "School",
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student",
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Class",
        required: true
    },
    date: {
        type: Date, 
        required: true
    },
    status: {
        type: String, 
        enum: ['Present', 'Absent'], 
        default: 'Absent'
    },
    notes: {
        type: String,
        default: ''
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

// Create compound index to ensure unique attendance per student per day per class
attendanceSchema.index({ 
    student: 1, 
    class: 1, 
    date: 1 
}, { 
    unique: true,
    name: 'unique_student_class_date_attendance'
});

// Create additional indexes for better query performance
attendanceSchema.index({ class: 1, date: 1 });
attendanceSchema.index({ school: 1, date: 1 });
attendanceSchema.index({ student: 1, date: -1 });

// Middleware to update the updatedAt field on save
attendanceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to check if attendance exists for a class on a specific date
attendanceSchema.statics.checkAttendanceExists = async function(classId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const attendance = await this.findOne({
        class: classId,
        date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });
    
    return !!attendance;
};

// Static method to get attendance summary for a class on a specific date
attendanceSchema.statics.getAttendanceSummary = async function(classId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const attendanceRecords = await this.find({
        class: classId,
        date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    }).populate('student', 'name');
    
    const summary = {
        totalStudents: attendanceRecords.length,
        present: attendanceRecords.filter(record => record.status === 'Present').length,
        absent: attendanceRecords.filter(record => record.status === 'Absent').length,
        attendanceRecords
    };
    
    return summary;
};

module.exports = mongoose.model("Attendance", attendanceSchema);