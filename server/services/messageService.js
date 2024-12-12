import Message from '../models/Message.js';

export const getMessagesByRoomId = async (roomId, limit = 50) => {
  return await Message.find({ roomId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}; 