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
    dateKey: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
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

// Compound unique index ensuring one attendance record per student per class per calendar dateKey
attendanceSchema.index({ 
    school: 1,
    student: 1, 
    class: 1, 
    dateKey: 1 
}, { 
    unique: true,
    name: 'unique_school_student_class_dateKey_attendance'
});

// Performance indexes
attendanceSchema.index({ school: 1, class: 1, dateKey: 1 });
attendanceSchema.index({ school: 1, student: 1, dateKey: -1 });

// Middleware to update the updatedAt field on save
attendanceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to check if attendance exists for a class on a specific dateKey
attendanceSchema.statics.checkAttendanceExists = async function(schoolId, classId, dateKey) {
    const attendance = await this.findOne({
        school: schoolId,
        class: classId,
        dateKey: dateKey
    });
    return !!attendance;
};

// Static method to get attendance summary using MongoDB $group aggregation pipeline
attendanceSchema.statics.getAttendanceSummary = async function(schoolId, classId, dateKey) {
    const summaryRecords = await this.aggregate([
        {
            $match: {
                school: new mongoose.Types.ObjectId(schoolId),
                class: new mongoose.Types.ObjectId(classId),
                dateKey: dateKey
            }
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ]);

    let present = 0;
    let absent = 0;
    for (const record of summaryRecords) {
        if (record._id === 'Present') present = record.count;
        if (record._id === 'Absent') absent = record.count;
    }

    return {
        totalStudents: present + absent,
        present,
        absent
    };
};

module.exports = mongoose.model("Attendance", attendanceSchema);