const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");
const Section = require("../models/Section");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

const configs = {
  students: { Model: Student, populate: "user", create: ["user", "studentNumber", "programme", "semester"] },
  faculty: { Model: Faculty, populate: "user", create: ["user", "employeeNumber", "department"] },
  courses: { Model: Course, create: ["courseCode", "title", "credits", "department"] },
  sections: { Model: Section, populate: ["course", { path: "faculty", populate: "user" }], create: ["course", "faculty", "sectionName", "academicYear", "term"] }
};

exports.list = (key) => asyncHandler(async (req, res) => {
  const { Model, populate } = configs[key];
  const filter = {};
  if (key === "courses" && req.query.department) filter.department = req.query.department;
  if (key === "sections" && req.query.course) filter.course = req.query.course;
  const { page, limit, skip } = req.pagination;
  let query = Model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
  if (populate) query = query.populate(populate);
  const [data, total] = await Promise.all([query, Model.countDocuments(filter)]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.create = (key) => asyncHandler(async (req, res) => {
  const { Model, create } = configs[key];
  const payload = {};
  create.forEach((field) => { if (req.body[field] !== undefined) payload[field] = req.body[field]; });
  if (key === "students" || key === "faculty") {
    const user = await User.findById(payload.user);
    if (!user) throw new ApiError(404, "Linked user not found");
    const expected = key === "students" ? "STUDENT" : "FACULTY";
    if (user.role !== expected) throw new ApiError(400, `Linked user must have role ${expected}`);
  }
  if (key === "sections") {
    if (!(await Course.exists({ _id: payload.course }))) throw new ApiError(404, "Course not found");
    if (!(await Faculty.exists({ _id: payload.faculty }))) throw new ApiError(404, "Faculty profile not found");
  }
  const item = await Model.create(payload);
  res.status(201).json({ success: true, data: item });
});

exports.get = (key) => asyncHandler(async (req, res) => {
  const { Model, populate } = configs[key];
  let query = Model.findById(req.params.id);
  if (populate) query = query.populate(populate);
  const item = await query;
  if (!item) throw new ApiError(404, `${key.slice(0, -1)} not found`);
  res.json({ success: true, data: item });
});

exports.update = (key) => asyncHandler(async (req, res) => {
  const { Model, create } = configs[key];
  const payload = {};
  create.forEach((field) => { if (req.body[field] !== undefined) payload[field] = req.body[field]; });
  const item = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, `${key.slice(0, -1)} not found`);
  res.json({ success: true, data: item });
});

exports.remove = (key) => asyncHandler(async (req, res) => {
  const { Model } = configs[key];
  const item = await Model.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, `${key.slice(0, -1)} not found`);
  res.status(204).send();
});

exports.enroll = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const [student, section] = await Promise.all([Student.findById(studentId), Section.findById(req.params.id)]);
  if (!student || !section) throw new ApiError(404, "Student or section not found");
  const enrollment = await Enrollment.create({ student: student._id, section: section._id });
  res.status(201).json({ success: true, data: enrollment });
});

exports.myCourses = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new ApiError(404, "Student profile not found");
  const enrollments = await Enrollment.find({ student: student._id, status: "ACTIVE" }).populate({ path: "section", populate: [{ path: "course" }, { path: "faculty", populate: "user" }] });
  res.json({ success: true, data: enrollments });
});
