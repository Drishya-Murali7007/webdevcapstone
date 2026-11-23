const Attendance = require("../models/Attendance");
const Enrollment = require("../models/Enrollment");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Section = require("../models/Section");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const eventBus = require("../events/eventBus");

exports.mark = asyncHandler(async (req, res) => {
  const { sectionId, sessionDate, sessionCode = "DEFAULT", records } = req.body;
  if (!Array.isArray(records) || records.length === 0) throw new ApiError(400, "records must be a non-empty array");
  const faculty = await Faculty.findOne({ user: req.user._id });
  if (!faculty) throw new ApiError(403, "Faculty profile required");
  const section = await Section.findById(sectionId);
  if (!section) throw new ApiError(404, "Section not found");
  if (section.faculty.toString() !== faculty._id.toString()) throw new ApiError(403, "You are not assigned to this section");
  const date = new Date(sessionDate);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid sessionDate");
  const courseId = section.course;
  const ids = records.map(r => r.studentId);
  const enrolled = await Enrollment.find({ section: sectionId, student: { $in: ids }, status: "ACTIVE" }).select("student");
  const enrolledIds = new Set(enrolled.map(e => e.student.toString()));
  const ops = records.map((r) => {
    if (!["PRESENT", "ABSENT", "LATE"].includes(r.status)) throw new ApiError(400, "Attendance status must be PRESENT, ABSENT or LATE");
    if (!enrolledIds.has(String(r.studentId))) throw new ApiError(400, `Student ${r.studentId} is not actively enrolled in this section`);
    return { insertOne: { document: { student: r.studentId, section: sectionId, course: courseId, sessionDate: date, sessionCode, status: r.status, markedBy: req.user._id } } };
  });
  await Attendance.bulkWrite(ops, { ordered: true });
  const payload = { sectionId: String(sectionId), courseId: String(courseId), sessionDate: date, sessionCode, markedBy: String(req.user._id), count: records.length };
  eventBus.emit("attendance:marked", payload);
  res.status(201).json({ success: true, message: "Attendance marked", data: payload });
});

exports.correct = asyncHandler(async (req, res) => {
  const { status, correctionReason } = req.body;
  if (!["PRESENT", "ABSENT", "LATE"].includes(status)) throw new ApiError(400, "Invalid attendance status");
  if (!correctionReason || correctionReason.trim().length < 5) throw new ApiError(400, "A correctionReason of at least 5 characters is required");
  const attendance = await Attendance.findById(req.params.id).populate("section");
  if (!attendance) throw new ApiError(404, "Attendance record not found");
  const faculty = await Faculty.findOne({ user: req.user._id });
  const isAssignedFaculty = faculty && attendance.section.faculty.toString() === faculty._id.toString();
  if (req.user.role !== "ADMIN" && !isAssignedFaculty) throw new ApiError(403, "Not permitted to correct this record");
  attendance.status = status;
  attendance.correctionReason = correctionReason;
  attendance.markedBy = req.user._id;
  await attendance.save();
  res.json({ success: true, data: attendance });
});

exports.mine = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new ApiError(404, "Student profile not found");
  const filter = { student: student._id };
  if (req.query.sectionId) filter.section = req.query.sectionId;
  const data = await Attendance.find(filter).populate("course section").sort({ sessionDate: -1 });
  res.json({ success: true, data });
});

exports.summary = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new ApiError(404, "Student profile not found");
  const data = await Attendance.aggregate([
    { $match: { student: student._id } },
    { $group: {
      _id: "$course",
      totalClasses: { $sum: 1 },
      attendedClasses: { $sum: { $cond: [{ $in: ["$status", ["PRESENT", "LATE"]] }, 1, 0] } }
    }},
    { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
    { $unwind: "$course" },
    { $project: {
      _id: 0, courseId: "$_id", courseCode: "$course.courseCode", courseTitle: "$course.title",
      totalClasses: 1, attendedClasses: 1,
      attendancePercentage: { $round: [{ $multiply: [{ $divide: ["$attendedClasses", "$totalClasses"] }, 100] }, 2] }
    }}
  ]);
  res.json({ success: true, data });
});

exports.sectionAttendance = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.sectionId);
  if (!section) throw new ApiError(404, "Section not found");
  if (req.user.role === "FACULTY") {
    const faculty = await Faculty.findOne({ user: req.user._id });
    if (!faculty || section.faculty.toString() !== faculty._id.toString()) throw new ApiError(403, "Not assigned to this section");
  }
  const filter = { section: section._id };
  if (req.query.date) {
    const start = new Date(req.query.date);
    if (Number.isNaN(start.getTime())) throw new ApiError(400, "Invalid date");
    const end = new Date(start); end.setDate(end.getDate() + 1);
    filter.sessionDate = { $gte: start, $lt: end };
  }
  const data = await Attendance.find(filter).populate({ path: "student", populate: "user" }).sort({ sessionDate: -1 });
  res.json({ success: true, data });
});
