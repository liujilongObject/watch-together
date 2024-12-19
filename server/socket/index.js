import { Server } from 'socket.io';
import { initRoomHandlers } from './handlers/roomHandler.js';
import { initVideoHandlers } from './handlers/videoHandler.js';
import { initChatHandlers } from './handlers/chatHandler.js';
import { getIPV4 } from '../utils.js';
import { initVoiceCallIO } from './voiceCall.js';

const port = process.env.PORT || 7766;
const CLIENT_URL = `http://${getIPV4()}:${port}`;

export const initSocket = (httpServer) => {
  try {
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [CLIENT_URL]
          : [`http://localhost:${port}`],
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
  
    initVoiceCallIO(io);
  
    return io;
  } catch (error) {
    console.error('Error initializing socket:', error);
    throw error;
  }
};
