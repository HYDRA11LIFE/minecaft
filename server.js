// Block Talk - signaling server for P2P (WebRTC mesh) voice chat.
// Audio never touches this server; it only relays connection setup messages.
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = parseInt(process.env.MAX_PER_ROOM || '8', 10);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000 });

const INDEX = path.join(__dirname, 'public', 'index.html');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('ok'));
app.get('/r/:room', (_req, res) => res.sendFile(INDEX));

// ICE servers: STUN by default. Add TURN via the ICE_SERVERS env var (JSON array).
app.get('/api/ice', (_req, res) => {
  let iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];
  if (process.env.ICE_SERVERS) {
    try { iceServers = JSON.parse(process.env.ICE_SERVERS); }
    catch (e) { console.error('ICE_SERVERS is not valid JSON'); }
  }
  res.set('Cache-Control', 'no-store').json({ iceServers });
});

const cleanRoom = s => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
const cleanName = s => String(s || '').replace(/[^\w \-]/g, '').trim().slice(0, 24) || 'Player';

io.on('connection', socket => {
  socket.on('join', (payload, ack) => {
    if (typeof ack !== 'function') return;
    const room = cleanRoom(payload && payload.room);
    if (!room) return ack({ ok: false, error: 'Invalid room name' });

    const members = io.sockets.adapter.rooms.get(room);
    if (members && members.size >= MAX_PER_ROOM && !members.has(socket.id)) {
      return ack({ ok: false, error: `Room is full (max ${MAX_PER_ROOM})` });
    }

    socket.data = { room, name: cleanName(payload.name), muted: false };
    const peers = [];
    if (members) {
      for (const id of members) {
        const s = io.sockets.sockets.get(id);
        if (s && s.data) peers.push({ id, name: s.data.name, muted: s.data.muted });
      }
    }
    socket.join(room);
    ack({ ok: true, id: socket.id, peers });
    socket.to(room).emit('peer-joined', { id: socket.id, name: socket.data.name, muted: false });
  });

  // Relay SDP offers/answers and ICE candidates, only inside the same room.
  socket.on('signal', ({ to, data } = {}) => {
    const target = io.sockets.sockets.get(to);
    if (!target || !socket.data || !target.data || target.data.room !== socket.data.room) return;
    target.emit('signal', { from: socket.id, data });
  });

  socket.on('state', ({ muted } = {}) => {
    if (!socket.data || !socket.data.room) return;
    socket.data.muted = !!muted;
    socket.to(socket.data.room).emit('peer-state', { id: socket.id, muted: !!muted });
  });

  socket.on('disconnect', () => {
    if (socket.data && socket.data.room) {
      socket.to(socket.data.room).emit('peer-left', { id: socket.id });
    }
  });
});

server.listen(PORT, () => console.log(`Block Talk running on port ${PORT}`));
