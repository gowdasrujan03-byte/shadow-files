"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Crown,
  Users,
  Wifi,
  WifiOff,
  ShieldAlert,
  MapPin,
  Flag,
  Timer,
  Trophy,
  Target,
  Navigation
} from "lucide-react";
import "./multiplayer.css";

const MissionMap = dynamic(() => import("./mission-map"), {
  ssr: false,
  loading: () => (
    <div className="mp-map-loading">LOADING FIELD MAP...</div>
  )
});

const SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
  "https://shadow-files-backend-blfd.onrender.com";

const modes = [
  "Hunt the Shadow",
  "Mystery Hunters",
  "Shadow Tag",
  "Double Agent",
  "Escape the Zone"
];

type Checkpoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius: number;
  completedBy: string[];
};

type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

type Room = {
  code: string;
  mode: string;
  hostId: string;
  status: "waiting" | "playing" | "completed";
  players: Player[];
  checkpoints: Checkpoint[];
  timeLeft: number | null;
};

type Position = {
  lat: number;
  lng: number;
};

type LivePlayerLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export default function MultiplayerPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState(modes[0]);

  const [room, setRoom] = useState<Room | null>(null);
  const [role, setRole] = useState("");
  const [objective, setObjective] = useState("");

  const [clues, setClues] = useState<string[]>([]);
  const [finished, setFinished] = useState<any>(null);

  const [error, setError] = useState("");
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointClue, setCheckpointClue] = useState("");

  const [draftPoints, setDraftPoints] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [accuseId, setAccuseId] = useState("");

  const [shareLocation, setShareLocation] = useState(false);
  const [myPosition, setMyPosition] = useState<Position | null>(null);
  const [livePlayers, setLivePlayers] = useState<LivePlayerLocation[]>([]);
  const [gpsStatus, setGpsStatus] = useState("GPS NOT SHARED");

  const lastLocationSentAt = useRef(0);
  const autoLaunchHandled = useRef(false);

  // CONNECT TO LIVE SERVER
  useEffect(() => {
    const connection = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 20000
    });

    setSocket(connection);

    connection.on("connect", () => {
      setConnected(true);
      setError("");
    });

    connection.on("disconnect", () => {
      setConnected(false);
    });

    connection.on("connect_error", (err) => {
      setConnected(false);
      setError(
        `Cannot connect to game server: ${err.message}. Please try again.`
      );
    });

    connection.on("room:update", (data: Room) => {
      setRoom(data);
    });

    connection.on("mission:role", (data: {
      role: string;
      objective: string;
    }) => {
      setRole(data.role);
      setObjective(data.objective);
    });

    connection.on("checkpoint:clue", (data: {
      checkpointId: string;
      clue: string;
    }) => {
      setClues(old => [
        ...old,
        `${data.checkpointId}: ${data.clue}`
      ]);
    });

    connection.on("players:locations", (data: any) => {
      const incoming = Array.isArray(data?.players) ? data.players : [];

      const safeLocations: LivePlayerLocation[] = incoming.flatMap(
        (item: any) => {
          const lat = Number(item?.lat ?? item?.location?.lat);
          const lng = Number(item?.lng ?? item?.location?.lng);

          if (
            !item?.id ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return [];
          }

          return [{
            id: String(item.id),
            name: String(item.name || "Player"),
            lat,
            lng
          }];
        }
      );

      setLivePlayers(safeLocations);
    });

    connection.on("mission:finished", (data: any) => {
      setFinished(data);
      setShareLocation(false);
      setGpsStatus("MISSION ENDED");
    });

    return () => {
      connection.disconnect();
    };
  }, []);

  // AUTO CREATE OR JOIN FROM HOMEPAGE
  useEffect(() => {
    if (!connected || !socket || autoLaunchHandled.current) return;

    const params = new URLSearchParams(window.location.search);

    const action = params.get("action");
    if (action !== "create" && action !== "join") return;

    const incomingName = (params.get("name") || "").trim().slice(0, 18);
    const incomingMode = params.get("mode") || modes[0];
    const incomingCode = (params.get("code") || "").trim().toUpperCase();

    if (!incomingName) {
      setError("Please return to the homepage and enter your player name.");
      return;
    }

    if (action === "join" && !incomingCode) {
      setError("Room code is missing. Return to the homepage and enter it.");
      return;
    }

    autoLaunchHandled.current = true;

    setName(incomingName);
    setMode(modes.includes(incomingMode) ? incomingMode : modes[0]);
    setCode(incomingCode);

    setError(
      action === "create"
        ? "Creating your live room..."
        : "Joining the live room..."
    );

    const eventName = action === "create" ? "room:create" : "room:join";

    const payload = action === "create"
      ? {
          name: incomingName,
          mode: modes.includes(incomingMode) ? incomingMode : modes[0]
        }
      : {
          name: incomingName,
          code: incomingCode
        };

    socket.emit(eventName, payload, (response: any) => {
      if (!response?.ok) {
        setError(
          response?.error ||
          "The game server could not complete this request."
        );
        autoLaunchHandled.current = false;
        return;
      }

      setRoom(response.room);

      if (action === "create") {
        setCode(response.room.code);
      }

      setRole("");
      setShareLocation(false);
      setMyPosition(null);
      setLivePlayers([]);
      setClues([]);
      setFinished(null);
      setDraftPoints([]);
      setError("");

      window.history.replaceState({}, "", "/multiplayer");
    });
  }, [connected, socket]);

  const isHost = !!room && room.hostId === socket?.id;

  // LIVE GPS SHARING
  useEffect(() => {
    if (
      !socket ||
      !room ||
      room.status !== "playing" ||
      !shareLocation
    ) {
      if (room?.status !== "playing") {
        setMyPosition(null);
        setLivePlayers([]);
      }
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus("GPS NOT SUPPORTED");
      setError("This browser does not support location sharing.");
      setShareLocation(false);
      return;
    }

    setGpsStatus("REQUESTING GPS...");

    const watchId = navigator.geolocation.watchPosition(
      location => {
        const nextPosition = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };

        setMyPosition(nextPosition);
        setGpsStatus("LIVE LOCATION SHARING");

        const now = Date.now();

        if (now - lastLocationSentAt.current >= 2000) {
          lastLocationSentAt.current = now;

          socket.emit("player:location", {
            code: room.code,
            lat: nextPosition.lat,
            lng: nextPosition.lng
          });
        }
      },
      () => {
        setGpsStatus("LOCATION PERMISSION NEEDED");
        setError(
          "Allow location access in your browser to share your position with your team."
        );
        setShareLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [socket, room?.code, room?.status, shareLocation]);

  // CREATE ROOM
  function createRoom() {
    if (!socket || !name.trim()) {
      setError("Enter your player name.");
      return;
    }

    setError("");

    socket.emit(
      "room:create",
      {
        name: name.trim(),
        mode
      },
      (response: any) => {
        if (!response?.ok) {
          setError(response?.error || "Could not create the room.");
          return;
        }

        setRoom(response.room);
        setCode(response.room.code);
        setRole("");
        setShareLocation(false);
        setMyPosition(null);
        setLivePlayers([]);
        setClues([]);
        setFinished(null);
        setDraftPoints([]);
      }
    );
  }

  // JOIN ROOM
  function joinRoom() {
    if (!socket || !name.trim() || !code.trim()) {
      setError("Enter your name and room code.");
      return;
    }

    setError("");

    socket.emit(
      "room:join",
      {
        name: name.trim(),
        code: code.trim().toUpperCase()
      },
      (response: any) => {
        if (!response?.ok) {
          setError(response?.error || "Could not join the room.");
          return;
        }

        setRoom(response.room);
        setRole("");
        setShareLocation(false);
        setMyPosition(null);
        setLivePlayers([]);
        setClues([]);
        setFinished(null);
      }
    );
  }

  // COPY ROOM CODE
  async function copyCode() {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(room.code);
      setError("Room code copied successfully!");
    } catch {
      setError("Copy this room code manually: " + room.code);
    }
  }

  // GET GPS POSITION
  function getPosition(): Promise<Position> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          reject(
            new Error(
              "Location permission denied. Allow location access and try again."
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  // ADD CHECKPOINT
  async function addCheckpoint() {
    if (!room || !socket || !checkpointName.trim()) {
      setError("Enter a checkpoint name.");
      return;
    }

    if (draftPoints.length >= 5) {
      setError("Maximum 5 checkpoints allowed.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const position = await getPosition();

      const newPoint = {
        label: checkpointName.trim(),
        lat: position.lat,
        lng: position.lng,
        radius: 30,
        clue:
          checkpointClue.trim() ||
          "A new clue has been discovered."
      };

      const updatedPoints = [
        ...draftPoints,
        newPoint
      ];

      socket.emit(
        "mission:set-checkpoints",
        {
          code: room.code,
          checkpoints: updatedPoints
        },
        (response: any) => {
          setBusy(false);

          if (!response?.ok) {
            setError(response?.error || "Could not save checkpoint.");
            return;
          }

          setDraftPoints(updatedPoints);
          setCheckpointName("");
          setCheckpointClue("");
          setError("");
        }
      );
    } catch (err: any) {
      setBusy(false);
      setError(err.message);
    }
  }

  // START MISSION
  function startMission() {
    if (!socket || !room) return;

    if (room.players.length < 2) {
      setError("Invite at least one friend before starting.");
      return;
    }

    if (room.checkpoints.length === 0) {
      setError("Add at least one GPS checkpoint first.");
      return;
    }

    setError("");
    setFinished(null);
    setClues([]);

    socket.emit(
      "mission:start",
      { code: room.code },
      (response: any) => {
        if (!response?.ok) {
          setError(response?.error || "Could not start mission.");
        }
      }
    );
  }

  // CHECK IN AT CHECKPOINT
  async function checkIn(checkpointId: string) {
    if (!socket || !room) return;

    try {
      setBusy(true);
      setError("");

      const position = await getPosition();

      socket.emit(
        "checkpoint:checkin",
        {
          code: room.code,
          checkpointId,
          lat: position.lat,
          lng: position.lng
        },
        (response: any) => {
          setBusy(false);

          if (!response?.ok) {
            setError(response?.error || "Checkpoint check-in failed.");
            return;
          }

          setError(
            `Checkpoint completed! You earned ${response.pointsEarned} points.`
          );
        }
      );
    } catch (err: any) {
      setBusy(false);
      setError(err.message);
    }
  }

  // ACCUSE PLAYER
  function accusePlayer() {
    if (!socket || !room || !accuseId) {
      setError("Select a player to accuse.");
      return;
    }

    socket.emit(
      "mission:accuse",
      {
        code: room.code,
        targetId: accuseId
      },
      (response: any) => {
        if (!response?.ok) {
          setError(response?.error || "Accusation failed.");
          return;
        }

        setError(
          response.correct
            ? "Correct! The Shadow has been identified!"
            : "Incorrect accusation. The mission continues."
        );
      }
    );
  }

  // LOCATION SHARING CONTROL
  function toggleLocationSharing() {
    setError("");

    if (shareLocation && socket && room) {
      socket.emit(
        "player:location:stop",
        { code: room.code },
        (response: any) => {
          if (!response?.ok) {
            setError(
              response?.error ||
              "Could not confirm location cleanup from the server."
            );
          }
        }
      );

      setGpsStatus("GPS NOT SHARED");
      setMyPosition(null);
      setLivePlayers([]);
      lastLocationSentAt.current = 0;
    }

    setShareLocation(value => !value);
  }

  return (
    <main className="mp-page">
      <header className="mp-nav">
        <Link href="/" className="mp-brand">
          SHADOW <span>FILES</span>
        </Link>

        <Link href="/" className="mp-back">
          <ArrowLeft size={15} />
          HOMEPAGE
        </Link>
      </header>

      <section className="mp-wrap">
        <div className="mp-kicker">
          <span className="mp-dot" />
          OUTDOOR GAMEPLAY ENGINE / 3.0
        </div>

        <h1>
          YOUR CITY.
          <br />
          <em>YOUR MISSION.</em>
        </h1>

        <div className="mp-status">
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
          GAME SERVER: {connected ? "CONNECTED" : "DISCONNECTED"}
        </div>

        {!room ? (
          <div className="mp-columns">
            <section className="mp-panel">
              <Crown className="mp-icon" />

              <h2>CREATE A ROOM</h2>
              <p>Host a mission and invite your crew.</p>

              <label>PLAYER NAME</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={18}
              />

              <label>SELECT MISSION</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
              >
                {modes.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <button
                className="mp-primary"
                disabled={!connected}
                onClick={createRoom}
              >
                CREATE LIVE ROOM
              </button>
            </section>

            <section className="mp-panel">
              <Users className="mp-icon" />

              <h2>JOIN A ROOM</h2>
              <p>Enter your friend's invitation code.</p>

              <label>PLAYER NAME</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={18}
              />

              <label>ROOM CODE</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD-42"
                maxLength={10}
              />

              <button
                className="mp-secondary"
                disabled={!connected}
                onClick={joinRoom}
              >
                JOIN LIVE ROOM
              </button>
            </section>
          </div>
        ) : (
          <section className="mp-lobby">
            <div className="mp-kicker">
              LIVE ROOM · {room.status.toUpperCase()}
            </div>

            <h2>{room.mode}</h2>

            <div className="mp-room-code">
              <div>
                <small>YOUR ROOM CODE</small>
                <strong>{room.code}</strong>
              </div>

              <button onClick={copyCode}>
                <Copy size={15} /> COPY
              </button>
            </div>

            <h3 className="mp-section-title">
              <span><Users size={17} /> PLAYERS</span>
              {room.players.length}/20
            </h3>

            <div className="mp-players">
              {room.players.map(player => (
                <div className="mp-player" key={player.id}>
                  <div className="mp-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="mp-player-info">
                    <b>{player.name}</b>
                    <small>
                      {player.isHost ? "ROOM HOST" : "PLAYER"}
                    </small>
                    <small>SCORE: {player.score}</small>
                  </div>

                  {player.isHost && <Crown className="mp-crown" />}
                </div>
              ))}
            </div>

            {room.status === "playing" && (
              <div className="mp-game-section mp-location-consent">
                <h3>
                  <Navigation size={18} />
                  LIVE TEAM LOCATION
                </h3>

                <p>
                  Your location is shared only during this active mission
                  and only after you enable it. Investigators can see
                  Investigator teammates, never the Shadow. The Shadow
                  sees only their own position.
                </p>

                <div className="mp-location-control">
                  <span
                    className={
                      shareLocation
                        ? "mp-gps-online"
                        : "mp-gps-offline"
                    }
                  >
                    {gpsStatus}
                  </span>

                  <button
                    className={
                      shareLocation
                        ? "mp-secondary"
                        : "mp-primary"
                    }
                    onClick={toggleLocationSharing}
                  >
                    {shareLocation
                      ? "STOP SHARING LOCATION"
                      : "ENABLE LIVE LOCATION"}
                  </button>
                </div>
              </div>
            )}

            {room.checkpoints.length > 0 && (
              <MissionMap
                checkpoints={room.checkpoints}
                position={myPosition}
                players={livePlayers}
                role={role}
                sharing={shareLocation}
                myPlayerId={socket?.id || ""}
              />
            )}

            {room.status === "waiting" && isHost && (
              <div className="mp-game-section">
                <h3>
                  <MapPin size={18} />
                  GPS CHECKPOINT SETUP
                </h3>

                <p>
                  Add checkpoints at safe locations where players
                  are allowed to go.
                </p>

                <label>CHECKPOINT NAME</label>
                <input
                  value={checkpointName}
                  onChange={e => setCheckpointName(e.target.value)}
                  placeholder="Example: Park entrance"
                />

                <label>SECRET CLUE FOR INVESTIGATORS</label>
                <textarea
                  value={checkpointClue}
                  onChange={e => setCheckpointClue(e.target.value)}
                  placeholder="Enter a secret clue..."
                  rows={3}
                />

                <button
                  className="mp-secondary"
                  disabled={busy || draftPoints.length >= 5}
                  onClick={addCheckpoint}
                >
                  <MapPin size={16} />
                  {busy
                    ? "GETTING GPS..."
                    : "ADD CHECKPOINT AT MY LOCATION"}
                </button>

                <p>Checkpoints added: {draftPoints.length}/5</p>

                {draftPoints.map((point, index) => (
                  <div className="mp-checkpoint" key={index}>
                    <div>
                      <Flag size={15} />
                      <b>{point.label}</b>
                    </div>
                    <span>GPS SAVED</span>
                  </div>
                ))}

                <button
                  className="mp-primary"
                  disabled={
                    room.players.length < 2 ||
                    room.checkpoints.length === 0
                  }
                  onClick={startMission}
                >
                  START 20-MINUTE MISSION
                </button>
              </div>
            )}

            {room.status === "waiting" && !isHost && (
              <div className="mp-wait-note">
                Waiting for the host to set checkpoints and start the mission.
              </div>
            )}

            {room.status === "playing" && (
              <div className="mp-game-section">
                <h3>
                  <Timer size={18} />
                  MISSION IN PROGRESS
                </h3>

                <div className="mp-timer">
                  {Math.floor((room.timeLeft || 0) / 60)
                    .toString().padStart(2, "0")}
                  :
                  {((room.timeLeft || 0) % 60)
                    .toString().padStart(2, "0")}
                </div>

                <div className="mp-role">
                  <ShieldAlert size={23} />
                  <div>
                    <b>YOUR SECRET ROLE: {role || "WAITING..."}</b>
                    <small>{objective}</small>
                  </div>
                </div>

                <h3>
                  <MapPin size={18} />
                  MISSION CHECKPOINTS
                </h3>

                {room.checkpoints.map(point => (
                  <div className="mp-checkpoint" key={point.id}>
                    <div>
                      <b>{point.label}</b>
                      <small>
                        {point.completedBy.length} player check-in(s)
                      </small>
                    </div>

                    {!point.completedBy.includes(socket?.id || "") ? (
                      <button
                        onClick={() => checkIn(point.id)}
                        disabled={busy}
                      >
                        CHECK IN
                      </button>
                    ) : (
                      <span>COMPLETED</span>
                    )}
                  </div>
                ))}

                {role === "Investigator" && (
                  <div className="mp-clues">
                    <h3>
                      <Flag size={17} />
                      YOUR DISCOVERED CLUES
                    </h3>

                    {clues.length === 0 ? (
                      <p>No clues collected yet. Visit a checkpoint.</p>
                    ) : (
                      clues.map((clue, index) => (
                        <p key={index}>{clue}</p>
                      ))
                    )}
                  </div>
                )}

                {role === "Investigator" && (
                  <div className="mp-accuse">
                    <h3>
                      <Target size={18} />
                      IDENTIFY THE SHADOW
                    </h3>

                    <select
                      value={accuseId}
                      onChange={e => setAccuseId(e.target.value)}
                    >
                      <option value="">Select a player</option>

                      {room.players
                        .filter(player => player.id !== socket?.id)
                        .map(player => (
                          <option value={player.id} key={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>

                    <button
                      className="mp-primary"
                      onClick={accusePlayer}
                    >
                      ACCUSE PLAYER
                    </button>
                  </div>
                )}

                <div className="mp-scoreboard">
                  <h3>
                    <Trophy size={18} />
                    LIVE SCOREBOARD
                  </h3>

                  {[...room.players]
                    .sort((a, b) => b.score - a.score)
                    .map(player => (
                      <div key={player.id}>
                        <span>{player.name}</span>
                        <b>{player.score} PTS</b>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {room.status === "completed" && (
              <div className="mp-role">
                <Trophy size={25} />
                <div>
                  <b>MISSION COMPLETED</b>
                  <small>
                    {finished?.reason || "The mission has ended."}
                  </small>
                  <small>
                    WINNER: {finished?.winner || "See final scores"}
                  </small>
                </div>
              </div>
            )}
          </section>
        )}

        {error && <div className="mp-error">{error}</div>}

        <p className="mp-footnote">
          SHADOW FILES OUTDOOR MULTIPLAYER ·
          PLAY SAFELY IN PERMITTED AREAS.
        </p>
      </section>
    </main>
  );
}