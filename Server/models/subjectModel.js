const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true },
    subjectFee: { type: Number, default: 0 },
}, { timestamps: true });

// Multi-tenant indexes: subjectCode must be unique within a school
subjectSchema.index({ school: 1, subjectCode: 1 }, { unique: true });
subjectSchema.index({ school: 1 });

module.exports = mongoose.model("Subject", subjectSchema);