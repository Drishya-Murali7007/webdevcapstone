require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Student = require("../src/models/Student");
const Faculty = require("../src/models/Faculty");
const Course = require("../src/models/Course");
const Section = require("../src/models/Section");
const Enrollment = require("../src/models/Enrollment");
const Attendance = require("../src/models/Attendance");
const Announcement = require("../src/models/Announcement");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.deleteMany({}), Student.deleteMany({}), Faculty.deleteMany({}), Course.deleteMany({}), Section.deleteMany({}), Enrollment.deleteMany({}), Attendance.deleteMany({}), Announcement.deleteMany({})]);

  const passwordHash = await bcrypt.hash("Password123!", 12);
  const [adminUser, facultyUser, studentUser] = await User.create([
    { name: "Campus Admin", email: "admin@campus.test", passwordHash, role: "ADMIN" },
    { name: "Dr. Faculty", email: "faculty@campus.test", passwordHash, role: "FACULTY" },
    { name: "Aarav Student", email: "student@campus.test", passwordHash, role: "STUDENT" }
  ]);
  const faculty = await Faculty.create({ user: facultyUser._id, employeeNumber: "FAC-001", department: "Computer Science" });
  const student = await Student.create({ user: studentUser._id, studentNumber: "STU-001", programme: "B.Tech CSE", semester: 1 });
  const course = await Course.create({ courseCode: "CSE101", title: "Foundations of Computer Science", credits: 4, department: "Computer Science" });
  const section = await Section.create({ course: course._id, faculty: faculty._id, sectionName: "A", academicYear: "2026-27", term: "Semester 1" });
  await Enrollment.create({ student: student._id, section: section._id });
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = [0, 1, 2, 3, 4].map(days => { const d = new Date(today); d.setDate(d.getDate() - days); return d; });
  await Attendance.create(dates.map((date, i) => ({
    student: student._id, section: section._id, course: course._id, sessionDate: date,
    sessionCode: "LECTURE", status: i === 3 ? "ABSENT" : "PRESENT", markedBy: facultyUser._id
  })));
  await Announcement.create({ title: "Welcome", message: "Welcome to the new academic term.", audienceType: "UNIVERSITY", createdBy: adminUser._id });
  console.log("Seed completed.");
  console.log("Admin: admin@campus.test | Faculty: faculty@campus.test | Student: student@campus.test");
  console.log("Password for all demo accounts: Password123!");
  await mongoose.disconnect();
}
seed().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
