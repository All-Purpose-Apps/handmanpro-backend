// routes/clientRoutes.js
import express from 'express';
const router = express.Router();
import { getClients, createClient, updateClient, getClient, deleteClient } from '../controllers/clientController.js';

// @route   GET /api/clients
// @desc    Get all clients
router.get('/', getClients);

// @route   POST /api/clients
// @desc    Create a new client
router.post('/', createClient);

// @route   PUT /api/clients/:id
// @desc    Update a client
router.put('/:id', updateClient);

// @route   GET /api/clients/:id
// @desc    Get a client
router.get('/:id', getClient);

// @route   DELETE /api/clients/:id
// @desc    Delete a client
router.delete('/:id', deleteClient);

export default router;
