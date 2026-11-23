const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Section = require("../models/Section");
const Enrollment = require("../models/Enrollment");
let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN?.split(",") || true, credentials: true }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) return next(new Error("Unauthorized"));
      socket.user = { id: user._id.toString(), role: user.role };
      next();
    } catch {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      socket.join(`user:${socket.user.id}`);
      socket.join(`role:${socket.user.role}`);

      if (socket.user.role === "ADMIN") {
        socket.join("announcements:university");
      } else if (socket.user.role === "FACULTY") {
        const faculty = await Faculty.findOne({ user: socket.user.id });
        if (faculty) {
          const sections = await Section.find({ faculty: faculty._id }).select("_id course");
          for (const section of sections) {
            socket.join(`section:${section._id}`);
            socket.join(`course:${section.course}`);
          }
        }
      } else if (socket.user.role === "STUDENT") {
        const student = await Student.findOne({ user: socket.user.id });
        if (student) {
          const enrollments = await Enrollment.find({ student: student._id, status: "ACTIVE" }).populate("section", "course");
          for (const enrollment of enrollments) {
            if (enrollment.section) {
              socket.join(`section:${enrollment.section._id}`);
              socket.join(`course:${enrollment.section.course}`);
            }
          }
        }
      }

      socket.emit("socket:ready", { userId: socket.user.id, role: socket.user.role });
    } catch (err) {
      console.error("Socket room setup failed:", err.message);
      socket.disconnect(true);
    }
    socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.user.id}`));
  });
  return io;
}

function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}
function getIO() { return io; }
module.exports = { initializeSocket, emitToRoom, getIO };
