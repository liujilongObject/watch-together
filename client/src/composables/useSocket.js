import { ref } from 'vue';
import { io } from 'socket.io-client';

const socket = ref(null);

const port = process.env.PORT || 7766

const socketUrl = process.env.NODE_ENV === 'production' ? `${process.env.BASE_API_URL}:${port}` : `http://localhost:${port}`;

export function useSocket() {
  if (!socket.value) {
    socket.value = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // 全局错误处理
    socket.value.on('connect_error', (err) => {
      console.error('Socket 连接错误:', err);
    });

    socket.value.on('disconnect', (reason) => {
      console.log('Socket 断开连接:', reason);
    });

    socket.value.on('reconnect', (attemptNumber) => {
      console.log('Socket 重新连接成功, 尝试次数:', attemptNumber);
    });
  }

  return socket.value;
}