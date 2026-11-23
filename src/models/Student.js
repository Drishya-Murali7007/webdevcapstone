const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  studentNumber: { type: String, required: true, unique: true, trim: true },
  programme: { type: String, required: true, trim: true },
  semester: { type: Number, required: true, min: 1, max: 12 }
}, { timestamps: true });
module.exports = mongoose.model("Student", schema);
