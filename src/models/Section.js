const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  sectionName: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true, trim: true },
  term: { type: String, required: true, trim: true }
}, { timestamps: true });
schema.index({ course: 1, sectionName: 1, academicYear: 1, term: 1 }, { unique: true });
module.exports = mongoose.model("Section", schema);
