const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    school: {type: mongoose.Schema.ObjectId, ref:"School"},
    subjectName : {type: String, required: true},
    subjectCode : {type: String, required: true},
    subjectFee : {type: Number, default: 0},
    createdAt:{type: Date, default: new Date()}

})

module.exports = mongoose.model("Subject", subjectSchema);