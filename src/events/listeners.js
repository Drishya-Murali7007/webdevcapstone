const eventBus = require("./eventBus");
const { emitToRoom } = require("../socket");

function registerEventListeners() {
  eventBus.on("attendance:marked", (payload) => {
    emitToRoom(`section:${payload.sectionId}`, "attendance:updated", payload);
    console.log(`[EventEmitter] attendance:marked for section ${payload.sectionId}`);
  });
  eventBus.on("announcement:created", (payload) => {
    if (payload.audienceType === "UNIVERSITY") {
      emitToRoom("announcements:university", "announcement:new", payload);
      emitToRoom("role:STUDENT", "announcement:new", payload);
      emitToRoom("role:FACULTY", "announcement:new", payload);
      emitToRoom("role:ADMIN", "announcement:new", payload);
    } else {
      const room = `${payload.audienceType.toLowerCase()}:${payload.audienceId}`;
      emitToRoom(room, "announcement:new", payload);
    }
    console.log(`[EventEmitter] announcement:created (${payload.audienceType})`);
  });
}
module.exports = { registerEventListeners };
