const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

exports.enrollments = asyncHandler(async (req, res) => {
  const data = await Enrollment.aggregate([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: "$section", enrolledStudents: { $sum: 1 } } },
    { $lookup: { from: "sections", localField: "_id", foreignField: "_id", as: "section" } },
    { $unwind: "$section" },
    { $lookup: { from: "courses", localField: "section.course", foreignField: "_id", as: "course" } },
    { $unwind: "$course" },
    { $project: { _id: 0, sectionId: "$_id", sectionName: "$section.sectionName", courseCode: "$course.courseCode", courseTitle: "$course.title", enrolledStudents: 1 } },
    { $sort: { courseCode: 1, sectionName: 1 } }
  ]);
  res.json({ success: true, data });
});

exports.lowAttendance = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold ?? 75);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new ApiError(400, "threshold must be between 0 and 100");
  const data = await Attendance.aggregate([
    { $group: {
      _id: { student: "$student", course: "$course" },
      totalClasses: { $sum: 1 },
      attendedClasses: { $sum: { $cond: [{ $in: ["$status", ["PRESENT", "LATE"]] }, 1, 0] } }
    }},
    { $addFields: { percentage: { $multiply: [{ $divide: ["$attendedClasses", "$totalClasses"] }, 100] } } },
    { $match: { percentage: { $lt: threshold } } },
    { $lookup: { from: "students", localField: "_id.student", foreignField: "_id", as: "student" } },
    { $unwind: "$student" },
    { $lookup: { from: "users", localField: "student.user", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $lookup: { from: "courses", localField: "_id.course", foreignField: "_id", as: "course" } },
    { $unwind: "$course" },
    { $project: { _id: 0, studentNumber: "$student.studentNumber", studentName: "$user.name", courseCode: "$course.courseCode", courseTitle: "$course.title", totalClasses: 1, attendedClasses: 1, attendancePercentage: { $round: ["$percentage", 2] } } },
    { $sort: { attendancePercentage: 1 } }
  ]);
  res.json({ success: true, data });
});
