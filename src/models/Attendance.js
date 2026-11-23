const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  sessionDate: { type: Date, required: true },
  sessionCode: { type: String, default: "DEFAULT", trim: true },
  status: { type: String, enum: ["PRESENT", "ABSENT", "LATE"], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  correctionReason: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });
schema.index({ student: 1, section: 1, sessionDate: 1, sessionCode: 1 }, { unique: true });
schema.index({ section: 1, sessionDate: 1 });
module.exports = mongoose.model("Attendance", schema);
