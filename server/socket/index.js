import { Server } from 'socket.io';
import { initRoomHandlers } from './handlers/roomHandler.js';
import { initVideoHandlers } from './handlers/videoHandler.js';
import { initChatHandlers } from './handlers/chatHandler.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    
    // 初始化各个处理器
    initRoomHandlers(io, socket);
    initVideoHandlers(io, socket);
    initChatHandlers(io, socket);
  });

  return io;
}; 