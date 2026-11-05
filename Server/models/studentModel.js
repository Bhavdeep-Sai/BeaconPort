const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    studentClass: { type: mongoose.Schema.ObjectId, ref: "Class" },
    enrolledSubjects: [{ type: mongoose.Schema.ObjectId, ref: 'Subject' }],
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    parent: { type: String, required: true },
    parentNum: { type: String, required: true },
    studentImg: { type: String, required: true },
    password: { type: String, required: true, select: false },
    encryptedPassword: { type: String, select: false },
}, { timestamps: true });

// Multi-tenant indexes
studentSchema.index({ school: 1, email: 1 }, { unique: true });
studentSchema.index({ school: 1, studentClass: 1 });
studentSchema.index({ school: 1 });

module.exports = mongoose.model("Student", studentSchema);

