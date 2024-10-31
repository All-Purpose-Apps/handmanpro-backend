import express from 'express';
const router = express.Router();
import { getAllProposals, createProposal, updateProposal, getProposalById, deleteProposal, createProposalPdf } from '../controllers/proposalController.js';

router.get('/', getAllProposals);

router.post('/', createProposal);

router.get('/:id', getProposalById);

router.put('/:id', updateProposal);

router.delete('/:id', deleteProposal);

router.post('/create-pdf', createProposalPdf);

export default router;
