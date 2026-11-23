const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["ADMIN", "FACULTY", "STUDENT"], required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
