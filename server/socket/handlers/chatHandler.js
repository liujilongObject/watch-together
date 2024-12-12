import Message from '../../models/Message.js';

export const initChatHandlers = (io, socket) => {
  // 发送消息
  socket.on('send-message', async (data) => {
    try {
      const { roomId, content, userId } = data;
      
      const message = new Message({
        roomId,
        userId,
        content
      });
      await message.save();
      
      io.to(roomId).emit('new-message', {
        id: message._id,
        userId,
        content,
        timestamp: message.timestamp
      });
    } catch (err) {
      console.error('发送消息失败:', err);
      socket.emit('message-error', { error: '发送失败' });
    }
  });
}; 