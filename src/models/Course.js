const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  credits: { type: Number, required: true, min: 1, max: 10 },
  department: { type: String, required: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.model("Course", schema);
