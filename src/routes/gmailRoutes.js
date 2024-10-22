import express from 'express';
import { listGmailMessages } from '../controllers/gmailController.js';

const router = express.Router();

// @route   GET /api/gmail/messages
// @desc    List Gmail messages
router.get('/messages', listGmailMessages);

export default router;
