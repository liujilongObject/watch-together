import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import path from 'path'
import { fileURLToPath } from 'url'
import { initSocket } from './socket/index.js';
import { connectDB } from './config/database.js';
import roomRoutes from './controllers/roomController.js';
import messageRoutes from './controllers/messageController.js';
import { getIPV4 } from './utils.js';

const app = express();
const httpServer = createServer(app);

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 初始化 Socket.IO
initSocket(httpServer);

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件中间件要在 API 路由之前，确保 * 路由能正确处理所有前端路由
app.use(express.static(path.join(__dirname, 'static')))

// 路由
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// 所有其他请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'))
})

// 连接数据库
connectDB();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${getIPV4()}:${PORT}`);
});
