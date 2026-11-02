# SHADOW FILES — Outdoor Multiplayer Website

A mobile-first Next.js homepage prototype for a real-world outdoor multiplayer game platform.

## Requirements
- Node.js 20.9 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Included in this prototype
- Responsive landing page and outdoor game-selection cards
- Mission brief modal for five outdoor game modes
- Create-room demo with generated share code and copy action
- Join-room interface with basic client-side form validation
- Safety guidance for outdoor play

## Important prototype limitations
This is a frontend prototype. Room codes are generated locally and are not registered with a server. Joining a room does not connect players yet. There is no live matchmaking, GPS validation, QR check-in, authentication, or real-time multiplayer backend. Those are subsequent development milestones.

## Next development milestone
Add a Node.js/Colyseus or Socket.IO game service, persistent rooms, server-side mission state, and QR checkpoint validation. Keep location permission optional and use clearly defined safe play zones.
