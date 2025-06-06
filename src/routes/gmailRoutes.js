import express from 'express';
import { listGmailMessages, sendEmail, sendProposal, sendReviewRequestEmail } from '../controllers/gmailController.js';

const router = express.Router();

// @route   GET /api/gmail/messages
// @desc    List Gmail messages
router.get('/messages', listGmailMessages);

// @route   POST /api/gmail/send
// @desc    Send an email
router.post('/send', sendEmail);

// @route   POST /api/gmail/send-review-request
// @desc    Send a review request email
router.post('/send-review-request', sendReviewRequestEmail);

router.post('/send-proposal', sendProposal);

export default router;
