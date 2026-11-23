const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  employeeNumber: { type: String, required: true, unique: true, trim: true },
  department: { type: String, required: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.model("Faculty", schema);
