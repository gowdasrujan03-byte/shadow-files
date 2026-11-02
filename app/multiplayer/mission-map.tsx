"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";

type Checkpoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius: number;
  completedBy: string[];
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

type Props = {
  checkpoints: Checkpoint[];
  position: Position | null;
  players: LivePlayerLocation[];
  role: string;
  sharing: boolean;
  myPlayerId: string;
};

function distanceBetween(a: Position, b: Position) {
  const rad = (n: number) => n * Math.PI / 180;
  const R = 6371000;

  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return Math.round(
    R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  );
}

function MapFollower({
  position
}: {
  position: Position | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(
        [position.lat, position.lng],
        16,
        { animate: true }
      );
    }
  }, [position, map]);

  return null;
}

export default function MissionMap({
  checkpoints,
  position,
  players,
  role,
  sharing,
  myPlayerId
}: Props) {
  const fallback: [number, number] = [
    20.5937,
    78.9629
  ];

  const center: [number, number] = position
    ? [position.lat, position.lng]
    : fallback;

  // Defense in depth: Shadow markers are never shown to Investigators.
  const visiblePlayers =
    role === "Shadow"
      ? players.filter(player => player.id === myPlayerId)
      : role === "Investigator"
        ? players
        : [];

  const teammates = visiblePlayers.filter(
    player => player.id !== myPlayerId
  );

  return (
    <section className="mp-map-section">

      <div className="mp-map-heading">
        <div>
          <span className="mp-map-kicker">
            FIELD NAVIGATION SYSTEM
          </span>
          <h3>LIVE MISSION MAP</h3>
        </div>

        <span
          className={
            sharing && position
              ? "mp-gps-online"
              : "mp-gps-offline"
          }
        >
          {sharing && position
            ? "GPS ACTIVE"
            : "GPS NOT SHARED"}
        </span>
      </div>

      {!sharing && (
        <div className="mp-map-error">
          Enable live location sharing above to show your position
          and receive teammate locations.
        </div>
      )}

      <div className="mp-map-container">
        <MapContainer
          center={center}
          zoom={position ? 16 : 5}
          scrollWheelZoom={true}
          className="mp-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFollower position={position} />

          {position && sharing && (
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#328cff",
                fillOpacity: 1,
                weight: 3
              }}
            >
              <Popup>Your current location</Popup>
            </CircleMarker>
          )}

          {teammates.map(player => (
            <CircleMarker
              key={player.id}
              center={[player.lat, player.lng]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#21c7a8",
                fillOpacity: 1,
                weight: 2
              }}
            >
              <Popup>
                {player.name} · Investigator
              </Popup>
            </CircleMarker>
          ))}

          {checkpoints.map(point => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={11}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#f04444",
                fillOpacity: 1,
                weight: 2
              }}
            >
              <Popup>
                <strong>{point.label}</strong>
                <br />
                {point.completedBy.length} player check-in(s)
              </Popup>
            </CircleMarker>
          ))}

        </MapContainer>
      </div>

      <div className="mp-map-legend">
        <span>
          <i className="mp-map-blue" />
          YOUR LOCATION
        </span>

        {role === "Investigator" && (
          <span>
            <i
              className="mp-map-blue"
              style={{ backgroundColor: "#21c7a8" }}
            />
            INVESTIGATOR TEAM
          </span>
        )}

        <span>
          <i className="mp-map-red" />
          MISSION CHECKPOINT
        </span>
      </div>

      {role === "Investigator" && (
        <div className="mp-map-checkpoints">
          <div className="mp-map-point">
            <div>
              <b>TEAM LOCATIONS</b>
              <small>
                Only Investigator positions are shared with your team
              </small>
            </div>

            <strong>
              {teammates.length} teammate
              {teammates.length === 1 ? "" : "s"} visible
            </strong>
          </div>
        </div>
      )}

      <div className="mp-map-checkpoints">
        {checkpoints.map(point => {
          const distance =
            position && sharing
              ? distanceBetween(position, {
                  lat: point.lat,
                  lng: point.lng
                })
              : null;

          return (
            <div className="mp-map-point" key={point.id}>
              <div>
                <b>{point.label}</b>
                <small>
                  {point.id} · {point.radius}m check-in radius
                </small>
              </div>

              <strong>
                {distance === null
                  ? "GPS NOT SHARED"
                  : distance < 1000
                    ? `${distance} m away`
                    : `${(distance / 1000).toFixed(2)} km away`}
              </strong>
            </div>
          );
        })}
      </div>

    </section>
  );
}