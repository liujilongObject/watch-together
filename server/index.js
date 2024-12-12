import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import { initSocket } from './socket/index.js';
import { connectDB } from './config/database.js';
import roomRoutes from './controllers/roomController.js';

const app = express();
const httpServer = createServer(app);

// 初始化 Socket.IO
initSocket(httpServer);

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/rooms', roomRoutes);

// 连接数据库
connectDB();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 