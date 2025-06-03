import express from 'express';
import { getFilesFromBucket, deleteFileFromBucket, renameFileInBucket } from '../controllers/filesController.js';

const router = express.Router();

router.get('/', getFilesFromBucket);
router.delete('/delete', deleteFileFromBucket);
router.put('/rename', renameFileInBucket);

export default router;
