const roomUsers = new Map();

export const initRoomHandlers = (io, socket) => {
  socket.on('join-room', (data) => {
    const { roomId, isOwner } = data;
    socket.join(roomId);
    socket.data.isOwner = isOwner;
    
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(socket.id);
    
    io.to(roomId).emit('room-users-update', {
      count: roomUsers.get(roomId).size
    });
  });

  socket.on('disconnecting', () => {
    handleDisconnect(io, socket);
  });
};

const handleDisconnect = (io, socket) => {
  for (const roomId of socket.rooms) {
    if (roomId !== socket.id && roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(socket.id);
      
      io.to(roomId).emit('room-users-update', {
        count: roomUsers.get(roomId).size
      });
      
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      }
    }
  }
}; 