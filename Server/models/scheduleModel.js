const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.ObjectId, 
        ref: "School",
        required: true
    },
    teacher: {
        type: mongoose.Schema.ObjectId, 
        ref: "Teacher",
        required: true
    },
    subject: {
        type: mongoose.Schema.ObjectId, 
        ref: "Subject",
        required: true
    },
    class: {
        type: mongoose.Schema.ObjectId, 
        ref: "Class",
        required: true
    },
    startTime: {
        type: Date, 
        required: true,
        validate: {
            validator: function(v) {
                return v instanceof Date && !isNaN(v);
            },
            message: props => `${props.value} is not a valid date!`
        }
    },
    endTime: {
        type: Date, 
        required: true,
        validate: {
            validator: function(v) {
                return v instanceof Date && !isNaN(v);
            },
            message: props => `${props.value} is not a valid date!`
        }
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date, 
        default: Date.now
    }
});


scheduleSchema.pre('save', function(next) {
    if (this.startTime >= this.endTime) {
        return next(new Error('End time must be after start time'));
    }
    next();
});


scheduleSchema.index({ endTime: 1, status: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);