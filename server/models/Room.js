import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('Room', roomSchema);
