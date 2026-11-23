const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new ApiError(401, "Authentication token required", "UNAUTHORIZED");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired access token", "INVALID_TOKEN");
  }
  const user = await User.findById(payload.sub).select("-passwordHash");
  if (!user || !user.isActive) throw new ApiError(401, "User account is unavailable", "UNAUTHORIZED");
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action", "FORBIDDEN"));
  }
  next();
};

module.exports = { authenticate, authorize };
