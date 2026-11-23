const router = require("express").Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/auth");
const pagination = require("../middleware/pagination");
const auth = require("../controllers/authController");
const resources = require("../controllers/resourceController");
const attendance = require("../controllers/attendanceController");
const announcements = require("../controllers/announcementController");
const reports = require("../controllers/reportController");

router.post("/auth/register", [
  body("name").trim().notEmpty(), body("email").isEmail(), body("password").isLength({ min: 8 }),
  body("role").optional().isIn(["ADMIN", "FACULTY", "STUDENT"]), validate
], asyncHandler(auth.register));
router.post("/auth/login", [body("email").isEmail(), body("password").notEmpty(), validate], asyncHandler(auth.login));
router.post("/auth/refresh", [body("refreshToken").notEmpty(), validate], asyncHandler(auth.refresh));
router.post("/auth/logout", authenticate, asyncHandler(auth.logout));
router.get("/users/me", authenticate, asyncHandler(auth.me));
router.patch("/users/me", authenticate, asyncHandler(auth.updateMe));

// Registration is public but always creates STUDENT accounts. Only an authenticated ADMIN can set other roles.
router.post("/admin/users", authenticate, authorize("ADMIN"), [
  body("name").trim().notEmpty(), body("email").isEmail(), body("password").isLength({ min: 8 }),
  body("role").isIn(["ADMIN", "FACULTY", "STUDENT"]), validate
], asyncHandler(auth.register));

const admin = [authenticate, authorize("ADMIN"), pagination];
for (const key of ["students", "faculty", "courses", "sections"]) {
  router.get(`/${key}`, authenticate, pagination, resources.list(key));
  router.post(`/${key}`, ...admin, resources.create(key));
  router.get(`/${key}/:id`, authenticate, resources.get(key));
  router.patch(`/${key}/:id`, ...admin, resources.update(key));
  router.delete(`/${key}/:id`, ...admin, resources.remove(key));
}
router.post("/sections/:id/enrollments", ...admin, resources.enroll);
router.get("/students/me/courses", authenticate, authorize("STUDENT"), asyncHandler(resources.myCourses));

router.post("/attendance", authenticate, authorize("FACULTY"), [
  body("sectionId").notEmpty(), body("sessionDate").isISO8601(),
  body("records").isArray({ min: 1 }), validate
], attendance.mark);
router.patch("/attendance/:id", authenticate, authorize("ADMIN", "FACULTY"), attendance.correct);
router.get("/attendance/me", authenticate, authorize("STUDENT"), attendance.mine);
router.get("/attendance/summary/me", authenticate, authorize("STUDENT"), attendance.summary);
router.get("/sections/:sectionId/attendance", authenticate, authorize("ADMIN", "FACULTY"), attendance.sectionAttendance);

router.post("/announcements", authenticate, authorize("ADMIN", "FACULTY"), [
  body("title").trim().notEmpty(), body("message").trim().notEmpty(),
  body("audienceType").isIn(["UNIVERSITY", "SECTION", "COURSE"]), validate
], announcements.create);
router.get("/announcements", authenticate, announcements.list);

router.get("/reports/enrollments", authenticate, authorize("ADMIN"), reports.enrollments);
router.get("/reports/low-attendance", authenticate, authorize("ADMIN"), reports.lowAttendance);

module.exports = router;
