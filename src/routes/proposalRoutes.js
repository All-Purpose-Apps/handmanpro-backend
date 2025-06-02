import express from 'express';
const router = express.Router();
import {
  getAllProposals,
  createProposal,
  updateProposal,
  getProposalById,
  deleteProposal,
  createProposalPdf,
  createProposalToken,
  verifyProposalToken,
  revokeProposalToken,
  downloadProposalPdf,
  uploadProposalWithSignature,
} from '../controllers/proposalController.js';

router.get('/', getAllProposals);

router.post('/', createProposal);

router.get('/:id', getProposalById);

router.put('/:id', updateProposal);

router.delete('/:id', deleteProposal);

router.post('/create-pdf', createProposalPdf);

// Proposal Token and PDF routes
router.post('/create-token', createProposalToken);
router.post('/verify-token', verifyProposalToken);
router.post('/revoke-token', revokeProposalToken);

router.get('/download-pdf/:url', downloadProposalPdf);
router.post('/upload-pdf-with-signature', uploadProposalWithSignature);

export default router;
