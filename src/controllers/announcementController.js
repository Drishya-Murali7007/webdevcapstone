const Announcement = require("../models/Announcement");
const Faculty = require("../models/Faculty");
const Section = require("../models/Section");
const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const eventBus = require("../events/eventBus");

exports.create = asyncHandler(async (req, res) => {
  const { title, message, audienceType, audienceId = null } = req.body;
  if (!["UNIVERSITY", "SECTION", "COURSE"].includes(audienceType)) throw new ApiError(400, "Invalid audienceType");
  if (req.user.role === "FACULTY") {
    if (audienceType === "UNIVERSITY") throw new ApiError(403, "Faculty cannot publish university-wide announcements");
    const faculty = await Faculty.findOne({ user: req.user._id });
    if (!faculty) throw new ApiError(403, "Faculty profile required");
    if (audienceType === "SECTION") {
      const section = await Section.findById(audienceId);
      if (!section || section.faculty.toString() !== faculty._id.toString()) throw new ApiError(403, "Not assigned to this section");
    } else {
      const assigned = await Section.exists({ faculty: faculty._id, course: audienceId });
      if (!assigned) throw new ApiError(403, "You are not assigned to this course");
    }
  }
  if (audienceType !== "UNIVERSITY" && !audienceId) throw new ApiError(400, "audienceId is required");
  const announcement = await Announcement.create({ title, message, audienceType, audienceId, createdBy: req.user._id });
  eventBus.emit("announcement:created", {
    id: announcement._id.toString(), title, message, audienceType, audienceId: audienceId ? audienceId.toString() : null
  });
  res.status(201).json({ success: true, data: announcement });
});


exports.list = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === "STUDENT") {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found");
    const enrollments = await Enrollment.find({ student: student._id, status: "ACTIVE" }).populate("section", "course");
    const sectionIds = enrollments.filter(e => e.section).map(e => e.section._id);
    const courseIds = enrollments.filter(e => e.section).map(e => e.section.course);
    query = {
      $or: [
        { audienceType: "UNIVERSITY" },
        { audienceType: "SECTION", audienceId: { $in: sectionIds } },
        { audienceType: "COURSE", audienceId: { $in: courseIds } }
      ]
    };
  } else if (req.user.role === "FACULTY") {
    const faculty = await Faculty.findOne({ user: req.user._id });
    const sections = faculty ? await Section.find({ faculty: faculty._id }).select("_id course") : [];
    const sectionIds = sections.map(s => s._id);
    const courseIds = sections.map(s => s.course);
    query = {
      $or: [
        { audienceType: "UNIVERSITY" },
        { audienceType: "SECTION", audienceId: { $in: sectionIds } },
        { audienceType: "COURSE", audienceId: { $in: courseIds } }
      ]
    };
  }
  const data = await Announcement.find(query).populate("createdBy", "name role").sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data });
});
