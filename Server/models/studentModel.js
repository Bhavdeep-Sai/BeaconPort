const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    school : {type: mongoose.Schema.ObjectId, ref:"School"},
    email : {type: String, required: true},
    name : {type: String, required: true},
    studentClass : {type:mongoose.Schema.ObjectId, ref:"Class"},
    enrolledSubjects: [{type: mongoose.Schema.ObjectId, ref: 'Subject'}],
    age: {type: Number, required: true},
    gender: {type: String, required: true},
    parent: {type: String, required: true},
    parentNum: {type: String, required: true},
    studentImg: {type: String, required: true},
    password: {type: String, required: true},
    createdAt:{ type: Date, default: new Date()}
})


module.exports = mongoose.model("Student", studentSchema);

