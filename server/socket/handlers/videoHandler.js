import * as roomService from '../../services/roomService.js';

export const initVideoHandlers = (io, socket) => {
  socket.on('video-state-change', async (data) => {
    await handleVideoStateChange(io, socket, data);
  });

  socket.on('request-sync', (roomId) => {
    handleSyncRequest(io, socket, roomId);
  });

  socket.on('sync-response', (data) => {
    handleSyncResponse(io, data);
  });
};

const handleVideoStateChange = async (io, socket, data) => {
  try {
    const { roomId, currentTime, isPlaying } = data;
    await roomService.updateRoomState(roomId, currentTime, isPlaying);
    
    socket.to(roomId).emit('video-state-update', {
      currentTime,
      isPlaying,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('更新视频状态失败:', err);
  }
};

const handleSyncRequest = (io, socket, roomId) => {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  
  if (!sockets) {
    console.log('房间不存在');
    return;
  }

  for (const socketId of sockets) {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket.data.isOwner) {
      clientSocket.emit('sync-request', socket.id);
      break;
    }
  }
};

const handleSyncResponse = (io, { targetId, currentTime, isPlaying }) => {
  io.to(targetId).emit('video-state-update', {
    currentTime,
    isPlaying,
    timestamp: Date.now()
  });
}; 