const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { signAccessToken, signRefreshToken, hashToken } = require("../utils/tokens");
const ApiError = require("../utils/ApiError");

async function issueTokens(user) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, tokenId);
  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000)
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowedRole = req.user?.role === "ADMIN" ? role : "STUDENT";
  if (allowedRole && !["ADMIN", "FACULTY", "STUDENT"].includes(allowedRole)) throw new ApiError(400, "Invalid role");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: allowedRole || "STUDENT" });
  res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+passwordHash");
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  const tokens = await issueTokens(user);
  res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...tokens } });
};

exports.refresh = async (req, res) => {
  const token = req.body.refreshToken;
  if (!token) throw new ApiError(400, "refreshToken is required");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }
  if (payload.type !== "refresh") throw new ApiError(401, "Invalid refresh token");
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token), user: payload.sub, revokedAt: null });
  if (!stored || stored.expiresAt <= new Date()) throw new ApiError(401, "Refresh token has been revoked or expired");
  stored.revokedAt = new Date();
  await stored.save();
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, "User account is unavailable");
  const tokens = await issueTokens(user);
  res.json({ success: true, data: tokens });
};

exports.logout = async (req, res) => {
  const token = req.body.refreshToken;
  if (token) await RefreshToken.updateOne({ tokenHash: hashToken(token), user: req.user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  res.json({ success: true, message: "Logged out; refresh token revoked" });
};

exports.me = async (req, res) => res.json({ success: true, data: req.user });
exports.updateMe = async (req, res) => {
  const allowed = ["name"];
  for (const key of Object.keys(req.body)) if (!allowed.includes(key)) throw new ApiError(400, `Field '${key}' cannot be updated here`);
  const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true }).select("-passwordHash");
  res.json({ success: true, data: user });
};
