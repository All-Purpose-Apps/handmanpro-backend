import express from 'express';
const router = express.Router();
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  getInvoice,
  deleteInvoice,
  createInvoicePdf,
  downloadInvoicePdf,
  uploadPdfWithSignature,
  createToken,
  verifyToken,
  revokeToken,
} from '../controllers/invoiceController.js';

router.get('/', getInvoices);

router.post('/', createInvoice);

router.put('/:id', updateInvoice);

router.get('/:id', getInvoice);

router.delete('/:id', deleteInvoice);

router.post('/create-pdf', createInvoicePdf);

router.get('/download-pdf/:url', downloadInvoicePdf);

router.post('/upload-pdf-with-signature', uploadPdfWithSignature);

router.post('/create-token', createToken);

router.post('/verify-token', verifyToken);

router.post('/revoke-token', revokeToken);

export default router;
