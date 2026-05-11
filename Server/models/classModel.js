const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  school: {type: mongoose.Schema.ObjectId, ref: "School"},
  classText: {type: String, required: true},
  classNum: {type: String, required: true},
  attendee: {type: mongoose.Schema.ObjectId, ref: "Teacher"},
  classFee: {type: Number, default: 0},
  includedSubjects: [{type: mongoose.Schema.ObjectId, ref: "Subject"}],
  createAt: {type: Date, default: new Date()},
});

module.exports = mongoose.model("Class", classSchema);
