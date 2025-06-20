import express from 'express';
const router = express.Router();
import { getAllTokens, createToken, getToken, updateToken, deleteToken } from '../controllers/tokenController.js';

// Route to get all tokens
router.get('/', getAllTokens);

// Route to create a new token
router.post('/', createToken);

// Route to get a specific token by ID
router.get('/:id', getToken);

// Route to update a token by ID
router.put('/:id', updateToken);

// Route to delete a token by ID
router.delete('/:id', deleteToken);
