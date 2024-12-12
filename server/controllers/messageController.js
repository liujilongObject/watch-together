import express from 'express';
import * as messageService from '../services/messageService.js';

const router = express.Router();

router.get('/room/:roomId', async (req, res) => {
  try {
    const messages = await messageService.getMessagesByRoomId(req.params.roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 