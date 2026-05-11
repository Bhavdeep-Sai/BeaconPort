const mongoose = require("mongoose");

const teacherSchema = mongoose.Schema({
    school: {type: mongoose.Schema.ObjectId, ref: "school"},
    email: {type: String, required: true},
    name: {type: String, required: true},
    qualification: {type: String, required: true},
    subjects: [{type: mongoose.Schema.ObjectId, ref: "Subject"}],
    teacherClasses: [{type: mongoose.Schema.ObjectId, ref: "Class"}],
    age: {type: Number, required: true},
    gender: {type: String, required: true},
    teacherImg: {type: String, required: true},
    password: {type: String, required: true},
    salary: {type: Number, default: 0},
    createdAt: {type: Date, default: new Date()}
});


module.exports = mongoose.model("Teacher", teacherSchema);