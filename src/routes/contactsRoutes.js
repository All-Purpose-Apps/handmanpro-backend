import express from 'express';
import { listContacts, createGoogleContact, deleteContact } from '../controllers/contactsController.js';

const router = express.Router();

// @route   GET /api/google/contacts
// @desc    List Google Contacts
router.get('/', listContacts);

router.post('/', createGoogleContact);

router.delete('/', deleteContact);
export default router;
