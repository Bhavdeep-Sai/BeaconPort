const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  classText: { type: String, required: true },
  classNum: { type: String, required: true },
  attendee: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
  classFee: { type: Number, default: 0 },
  includedSubjects: [{ type: mongoose.Schema.ObjectId, ref: "Subject" }],
}, { timestamps: true });

// Index for multi-tenant query acceleration
classSchema.index({ school: 1 });

module.exports = mongoose.model("Class", classSchema);
