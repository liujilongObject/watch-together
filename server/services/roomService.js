import Room from '../models/Room.js';

export const createRoom = async (videoUrl) => {
  const roomId = Math.random().toString(36).substring(2, 8);
  const owner = Math.random().toString(36).substring(2, 10);
  
  const room = new Room({
    roomId,
    videoUrl,
    owner
  });
  
  await room.save();
  return { roomId, owner };
};

export const getRoomById = async (roomId) => {
  return await Room.findOne({ roomId });
};

export const updateRoomState = async (roomId, currentTime, isPlaying) => {
  return await Room.findOneAndUpdate(
    { roomId },
    { currentTime, isPlaying },
    { new: true }
  );
}; 