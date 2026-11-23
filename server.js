require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const app = require("./src/app");
const { initializeSocket } = require("./src/socket");
const { registerEventListeners } = require("./src/events/listeners");

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Copy .env.example to .env.");
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are missing. Configure them in .env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  registerEventListeners();
  const server = http.createServer(app);
  initializeSocket(server);

  server.listen(PORT, () => console.log(`Campus Management API running on http://localhost:${PORT}`));

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
