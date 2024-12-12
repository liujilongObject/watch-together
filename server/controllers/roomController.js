import express from 'express';
import * as roomService from '../services/roomService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const room = await roomService.createRoom(videoUrl);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const room = await roomService.getRoomById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 