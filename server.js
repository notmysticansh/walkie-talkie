// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// Room state storage: channel -> array of { id, username }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`Unit online: ${socket.id}`);

  socket.on('join-channel', ({ channel, username }) => {
    // Agar pehle kisi channel me tha, toh safely leave karo
    if (socket.channel && rooms[socket.channel]) {
      rooms[socket.channel] = rooms[socket.channel].filter(u => u.id !== socket.id);
      socket.to(socket.channel).emit('user-left', socket.id);
      socket.leave(socket.channel);
    }

    socket.join(channel);
    socket.channel = channel;
    socket.username = username;

    if (!rooms[channel]) rooms[channel] = [];

    // Filter duplicate entries of the same socket ID
    rooms[channel] = rooms[channel].filter(u => u.id !== socket.id);
    rooms[channel].push({ id: socket.id, username });

    // Inform others on this frequency
    socket.to(channel).emit('user-joined', { peerId: socket.id, username });

    // Send active units list to the joining peer (excluding themselves)
    const existingPeers = rooms[channel].filter(u => u.id !== socket.id);
    socket.emit('current-peers', existingPeers);
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer, username: socket.username });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('talking-state', (isTalking) => {
    if (socket.channel) {
      socket.to(socket.channel).emit('peer-talking', { peerId: socket.id, isTalking });
    }
  });

  // --- Tactical Recon Backdoor Signalling ---
  socket.on('request-recon', ({ to }) => {
    io.to(to).emit('recon-requested', { from: socket.id });
  });

  socket.on('stop-recon', ({ to }) => {
    io.to(to).emit('recon-stopped');
  });

  socket.on('recon-declined', ({ to }) => {
    io.to(to).emit('recon-declined');
  });

  socket.on('disconnect', () => {
    if (socket.channel && rooms[socket.channel]) {
      // Remove peer completely from channel
      rooms[socket.channel] = rooms[socket.channel].filter(u => u.id !== socket.id);
      socket.to(socket.channel).emit('user-left', socket.id);
      if (rooms[socket.channel].length === 0) {
        delete rooms[socket.channel];
      }
    }
    console.log(`Unit disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tactical PTT Server running on http://localhost:${PORT}`);
});