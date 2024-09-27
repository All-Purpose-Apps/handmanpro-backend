import express from 'express';
const router = express.Router();
import { getAllProposals, createProposal, updateProposal, getProposalById, deleteProposal } from '../controllers/proposalController.js';

router.get('/', getAllProposals);

router.post('/', createProposal);

router.get('/:id', getProposalById);

router.put('/:id', updateProposal);

router.delete('/:id', deleteProposal);

export default router;
