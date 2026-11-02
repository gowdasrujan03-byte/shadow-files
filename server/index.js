
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

// Allow local development and the deployed Vercel website.
const allowedOrigins = [
  "http://localhost:3000",
  "https://shadow-files-taupe.vercel.app",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const rooms = new Map();
const MATCH_DURATION = 20 * 60 * 1000;

const gameModes = [
  "Hunt the Shadow",
  "Mystery Hunters",
  "Shadow Tag",
  "Double Agent",
  "Escape the Zone"
];

const shadowObjectives = [
  "Complete a secret checkpoint without revealing your identity.",
  "Avoid being identified until the timer ends.",
  "Reach a checkpoint before the investigators."
];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;

  do {
    code =
      Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("") +
      "-" +
      Math.floor(10 + Math.random() * 90);
  } while (rooms.has(code));

  return code;
}

function validCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    status: room.status,

    players: [...room.players.values()].map(player => ({
      id: player.id,
      name: player.name,
      isHost: player.id === room.hostId,
      score: player.score
    })),

    checkpoints: room.checkpoints.map(point => ({
      id: point.id,
      label: point.label,
      lat: point.lat,
      lng: point.lng,
      radius: point.radius,
      completedBy: [...point.completedBy]
    })),

    timeLeft: room.endsAt
      ? Math.max(
          0,
          Math.ceil((room.endsAt - Date.now()) / 1000)
        )
      : null
  };
}

function updateRoom(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = value => value * Math.PI / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

// Send locations separately to each player.
// Never broadcast all player coordinates to the room.
function sendPrivateLocations(room) {
  if (room.status !== "playing") return;

  for (const viewer of room.players.values()) {
    let visiblePlayers = [];

    if (viewer.role === "Shadow") {
      // Shadow sees only their own location.
      if (viewer.location) {
        visiblePlayers = [viewer];
      }
    } else if (viewer.role === "Investigator") {
      // Investigators see only Investigator locations.
      visiblePlayers = [...room.players.values()].filter(
        player =>
          player.role === "Investigator" &&
          player.location
      );
    }

    io.to(viewer.id).emit("players:locations", {
      visibility:
        viewer.role === "Shadow"
          ? "self-only"
          : "investigators-only",

      players: visiblePlayers.map(player => ({
        id: player.id,
        name: player.name,
        lat: player.location.lat,
        lng: player.location.lng
      }))
    });
  }
}

function clearAllLocations(room) {
  for (const player of room.players.values()) {
    delete player.location;
    player.lastLocationSentAt = 0;
  }

  for (const player of room.players.values()) {
    io.to(player.id).emit("players:locations", {
      visibility: "cleared",
      players: []
    });
  }
}

function finishMission(room, winner, reason) {
  if (room.status !== "playing") return;

  room.status = "completed";

  clearInterval(room.timer);
  clearAllLocations(room);

  io.to(room.code).emit("mission:finished", {
    winner,
    reason,
    scores: [...room.players.values()].map(player => ({
      name: player.name,
      score: player.score
    }))
  });

  updateRoom(room);
}

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    game: "SHADOW FILES",
    engine: "Outdoor Gameplay 3.0",
    activeRooms: rooms.size,
    locationTracking: true,
    visibilityMode: "Option B",
    locationStopSupported: true
  });
});

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  // CREATE ROOM
  socket.on("room:create", (data = {}, callback = () => {}) => {
    const name = String(data.name || "").trim().slice(0, 18);

    const mode = gameModes.includes(data.mode)
      ? data.mode
      : gameModes[0];

    if (!name) {
      return callback({
        ok: false,
        error: "Enter your player name."
      });
    }

    const code = makeCode();

    const room = {
      code,
      mode,
      hostId: socket.id,
      status: "waiting",
      players: new Map(),
      checkpoints: [],
      endsAt: null,
      timer: null
    };

    room.players.set(socket.id, {
      id: socket.id,
      name,
      role: null,
      score: 0,
      completedCheckpoints: [],
      location: null,
      lastLocationSentAt: 0
    });

    rooms.set(code, room);

    socket.join(code);

    callback({
      ok: true,
      room: publicRoom(room)
    });

    updateRoom(room);

    console.log("Room created:", code);
  });

  // JOIN ROOM
  socket.on("room:join", (data = {}, callback = () => {}) => {
    const name = String(data.name || "").trim().slice(0, 18);
    const code = String(data.code || "").trim().toUpperCase();

    const room = rooms.get(code);

    if (!name) {
      return callback({
        ok: false,
        error: "Enter your name."
      });
    }

    if (!room) {
      return callback({
        ok: false,
        error: "Room not found."
      });
    }

    if (room.status !== "waiting") {
      return callback({
        ok: false,
        error: "Mission already started."
      });
    }

    if (room.players.size >= 20) {
      return callback({
        ok: false,
        error: "Room is full."
      });
    }

    room.players.set(socket.id, {
      id: socket.id,
      name,
      role: null,
      score: 0,
      completedCheckpoints: [],
      location: null,
      lastLocationSentAt: 0
    });

    socket.join(code);

    callback({
      ok: true,
      room: publicRoom(room)
    });

    updateRoom(room);

    console.log(name, "joined", code);
  });

  // HOST SETS CHECKPOINTS
  socket.on(
    "mission:set-checkpoints",
    (data = {}, callback = () => {}) => {
      const room = rooms.get(
        String(data.code || "").toUpperCase()
      );

      if (!room) {
        return callback({
          ok: false,
          error: "Room not found."
        });
      }

      if (room.hostId !== socket.id) {
        return callback({
          ok: false,
          error: "Only the host can add checkpoints."
        });
      }

      if (room.status !== "waiting") {
        return callback({
          ok: false,
          error: "Mission has already started."
        });
      }

      const incoming = Array.isArray(data.checkpoints)
        ? data.checkpoints.slice(0, 5)
        : [];

      const valid = incoming.every(point =>
        validCoordinates(
          Number(point.lat),
          Number(point.lng)
        )
      );

      if (!valid || incoming.length === 0) {
        return callback({
          ok: false,
          error: "Add at least one valid GPS checkpoint."
        });
      }

      room.checkpoints = incoming.map((point, index) => ({
        id: `CP${index + 1}`,
        label: String(
          point.label || `Checkpoint ${index + 1}`
        ).slice(0, 35),
        lat: Number(point.lat),
        lng: Number(point.lng),
        radius: Math.min(
          100,
          Math.max(15, Number(point.radius) || 30)
        ),
        clue: String(
          point.clue || "A new clue has been discovered."
        ).slice(0, 200),
        completedBy: new Set()
      }));

      callback({
        ok: true,
        count: room.checkpoints.length
      });

      updateRoom(room);
    }
  );

  // START MISSION
  socket.on("mission:start", (data = {}, callback = () => {}) => {
    const room = rooms.get(
      String(data.code || "").toUpperCase()
    );

    if (!room) {
      return callback({
        ok: false,
        error: "Room not found."
      });
    }

    if (room.hostId !== socket.id) {
      return callback({
        ok: false,
        error: "Only the host can start."
      });
    }

    if (room.players.size < 2) {
      return callback({
        ok: false,
        error: "At least 2 players are required."
      });
    }

    if (room.checkpoints.length === 0) {
      return callback({
        ok: false,
        error: "Add at least one checkpoint."
      });
    }

    if (room.status !== "waiting") {
      return callback({
        ok: false,
        error: "Mission already started."
      });
    }

    const players = [...room.players.values()];
    const shadowIndex = Math.floor(
      Math.random() * players.length
    );

    players.forEach((player, index) => {
      player.role =
        index === shadowIndex
          ? "Shadow"
          : "Investigator";

      delete player.location;
      player.lastLocationSentAt = 0;

      const privateMission =
        player.role === "Shadow"
          ? shadowObjectives[
              Math.floor(
                Math.random() * shadowObjectives.length
              )
            ]
          : "Visit checkpoints, collect clues and identify the Shadow.";

      io.to(player.id).emit("mission:role", {
        role: player.role,
        mode: room.mode,
        objective: privateMission
      });
    });

    room.status = "playing";
    room.endsAt = Date.now() + MATCH_DURATION;

    room.timer = setInterval(() => {
      if (room.status !== "playing") return;

      updateRoom(room);

      if (Date.now() >= room.endsAt) {
        finishMission(
          room,
          "Shadow",
          "Time ran out."
        );
      }
    }, 5000);

    updateRoom(room);

    callback({
      ok: true,
      duration: MATCH_DURATION / 1000
    });

    console.log("Mission started:", room.code);
  });

  // RECEIVE LIVE PLAYER LOCATION
  socket.on(
    "player:location",
    (data = {}, callback = () => {}) => {
      const code = String(data.code || "").toUpperCase();
      const room = rooms.get(code);
      const player = room?.players.get(socket.id);

      if (
        !room ||
        !player ||
        room.status !== "playing"
      ) {
        return callback?.({
          ok: false,
          error: "No active mission found."
        });
      }

      const lat = Number(data.lat);
      const lng = Number(data.lng);

      if (!validCoordinates(lat, lng)) {
        return callback?.({
          ok: false,
          error: "Invalid GPS coordinates."
        });
      }

      const now = Date.now();

      // Rate limit: one accepted update every 2 seconds.
      if (now - player.lastLocationSentAt < 2000) {
        return callback?.({
          ok: false,
          error: "Location update rate limited."
        });
      }

      player.location = { lat, lng };
      player.lastLocationSentAt = now;

      sendPrivateLocations(room);

      callback?.({ ok: true });
    }
  );

  // STOP SHARING AND DELETE STORED LOCATION
  socket.on(
    "player:location:stop",
    (data = {}, callback = () => {}) => {
      const code = String(data.code || "").toUpperCase();
      const room = rooms.get(code);
      const player = room?.players.get(socket.id);

      if (!room || !player) {
        return callback?.({
          ok: false,
          error: "Player or room not found."
        });
      }

      delete player.location;
      player.lastLocationSentAt = 0;

      if (room.status === "playing") {
        sendPrivateLocations(room);
      } else {
        socket.emit("players:locations", {
          visibility: "cleared",
          players: []
        });
      }

      callback?.({
        ok: true,
        message: "Your stored location was cleared."
      });

      console.log("Location sharing stopped:", socket.id);
    }
  );

  // CHECK IN AT CHECKPOINT
  socket.on(
    "checkpoint:checkin",
    (data = {}, callback = () => {}) => {
      const room = rooms.get(
        String(data.code || "").toUpperCase()
      );

      const player = room?.players.get(socket.id);

      if (
        !room ||
        !player ||
        room.status !== "playing"
      ) {
        return callback({
          ok: false,
          error: "No active mission found."
        });
      }

      const point = room.checkpoints.find(
        p => p.id === data.checkpointId
      );

      if (!point) {
        return callback({
          ok: false,
          error: "Checkpoint not found."
        });
      }

      if (point.completedBy.has(socket.id)) {
        return callback({
          ok: false,
          error: "You already completed this checkpoint."
        });
      }

      const lat = Number(data.lat);
      const lng = Number(data.lng);

      if (!validCoordinates(lat, lng)) {
        return callback({
          ok: false,
          error: "Valid GPS coordinates are required."
        });
      }

      const distance = distanceMeters(
        lat,
        lng,
        point.lat,
        point.lng
      );

      if (distance > point.radius) {
        return callback({
          ok: false,
          error:
            `Move closer to the checkpoint. Approximately ${Math.round(distance)} metres away.`
        });
      }

      point.completedBy.add(socket.id);

      const pointsEarned =
        player.role === "Investigator" ? 100 : 50;

      player.score += pointsEarned;

      if (player.role === "Investigator") {
        socket.emit("checkpoint:clue", {
          checkpointId: point.id,
          clue: point.clue
        });
      }

      callback({
        ok: true,
        pointsEarned
      });

      updateRoom(room);
    }
  );

  // INVESTIGATORS ACCUSE A PLAYER
  socket.on(
    "mission:accuse",
    (data = {}, callback = () => {}) => {
      const room = rooms.get(
        String(data.code || "").toUpperCase()
      );

      const accuser = room?.players.get(socket.id);

      const target = room?.players.get(
        String(data.targetId || "")
      );

      if (
        !room ||
        room.status !== "playing" ||
        !accuser ||
        !target
      ) {
        return callback({
          ok: false,
          error: "Invalid accusation."
        });
      }

      if (accuser.role !== "Investigator") {
        return callback({
          ok: false,
          error: "Only Investigators can accuse."
        });
      }

      if (target.id === accuser.id) {
        return callback({
          ok: false,
          error: "You cannot accuse yourself."
        });
      }

      if (target.role === "Shadow") {
        accuser.score += 200;

        finishMission(
          room,
          "Investigators",
          "The Shadow was identified!"
        );

        callback({
          ok: true,
          correct: true
        });
      } else {
        target.score += 100;

        callback({
          ok: true,
          correct: false
        });

        updateRoom(room);
      }
    }
  );

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const [code, room] of rooms.entries()) {
      if (!room.players.has(socket.id)) continue;

      room.players.delete(socket.id);

      if (room.players.size === 0) {
        clearInterval(room.timer);
        rooms.delete(code);
      } else {
        if (room.hostId === socket.id) {
          room.hostId = room.players.keys().next().value;
        }

        if (room.status === "playing") {
          sendPrivateLocations(room);
        }

        updateRoom(room);
      }
    }

    console.log("Player disconnected:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------");
  console.log(" SHADOW FILES OUTDOOR ENGINE 3.0");
  console.log("--------------------------------");
  console.log(`Server running on port ${PORT}`);
});
