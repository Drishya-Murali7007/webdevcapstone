const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  status: { type: String, enum: ["ACTIVE", "DROPPED"], default: "ACTIVE" },
  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true });
schema.index({ student: 1, section: 1 }, { unique: true });
module.exports = mongoose.model("Enrollment", schema);
