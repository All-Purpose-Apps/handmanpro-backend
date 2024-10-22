import express from 'express';
import { listContacts } from '../controllers/contactsController.js';

const router = express.Router();

// @route   GET /api/google/contacts
// @desc    List Google Contacts
router.get('/', listContacts);

export default router;
