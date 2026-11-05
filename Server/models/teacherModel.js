const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    qualification: { type: String, required: true },
    subjects: [{ type: mongoose.Schema.ObjectId, ref: "Subject" }],
    teacherClasses: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    teacherImg: { type: String, required: true },
    password: { type: String, required: true, select: false },
    encryptedPassword: { type: String, select: false },
    salary: { type: Number, default: 0 },
}, { timestamps: true });

// Tenant-scoped unique email index and multi-tenant acceleration index
teacherSchema.index({ school: 1, email: 1 }, { unique: true });
teacherSchema.index({ school: 1 });

module.exports = mongoose.model("Teacher", teacherSchema);