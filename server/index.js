import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import Room from './models/Room.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置 dotenv，明确指定 .env 文件路径
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// 连接数据库
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB 连接成功');
  })
  .catch((error) => {
    console.error('MongoDB 连接失败:', error);
  });

// 创建房间
app.post('/api/rooms', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const roomId = Math.random().toString(36).substring(2, 8);
    const owner = Math.random().toString(36).substring(2, 10);
    const room = new Room({
      roomId,
      videoUrl,
      owner
    });
    await room.save();
    res.json({ roomId, owner });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取房间信息
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 存储房间用户信息的 Map
const roomUsers = new Map();

// WebSocket 处理
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, isOwner } = data;
    socket.join(roomId);
    
    // 保存房主标记
    socket.data.isOwner = isOwner;
    
    // 更新房间人数
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(socket.id);
    
    io.to(roomId).emit('room-users-update', {
      count: roomUsers.get(roomId).size
    });
  });

  socket.on('disconnecting', () => {
    // 在断开连接时更新房间人数
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id && roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        
        // 广播更新后的人数
        io.to(roomId).emit('room-users-update', {
          count: roomUsers.get(roomId).size
        });
        
        // 如果房间没有人了，清理房间数据
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        }
      }
    }
  });

  socket.on('video-state-change', async (data) => {
    try {
      const { roomId, currentTime, isPlaying } = data;
      await Room.findOneAndUpdate(
        { roomId },
        { currentTime, isPlaying },
        { new: true }
      );
      // 广播给房间内其他用户
      socket.to(roomId).emit('video-state-update', { 
        currentTime, 
        isPlaying,
        timestamp: Date.now() 
      });
    } catch (err) {
      console.error('更新视频状态失败:', err);
    }
  });

  socket.on('request-sync', (roomId) => {
    console.log('同步请求，房间:', roomId);
    const sockets = io.sockets.adapter.rooms.get(roomId);
    
    if (!sockets) {
      console.log('房间不存在');
      return;
    }

    for (const socketId of sockets) {
      const clientSocket = io.sockets.sockets.get(socketId);
      console.log('检查socket:', socketId, '是否是房主:', clientSocket.data.isOwner);
      if (clientSocket.data.isOwner) {
        console.log('找到房主,发送同步请求');
        clientSocket.emit('sync-request', socket.id);
        break;
      }
    }
  });

  socket.on('sync-response', ({ targetId, currentTime, isPlaying }) => {
    // 直接转发请求同步的用户
    io.to(targetId).emit('video-state-update', {
      currentTime,
      isPlaying,
      timestamp: Date.now()
    });
  });
});

const PORT = 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on  http://localhost:${PORT}`);
}); 