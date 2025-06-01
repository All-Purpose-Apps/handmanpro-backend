import express from 'express';
import { getFilesFromBucket } from '../controllers/filesController.js';

const router = express.Router();

router.get('/', getFilesFromBucket);

export default router;
