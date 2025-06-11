import express from 'express';
import { getFilesFromBucket, deleteFileFromBucket, renameFileInBucket, showDeletedFilesInBucket } from '../controllers/filesController.js';

const router = express.Router();

router.get('/', getFilesFromBucket);
router.delete('/delete', deleteFileFromBucket);
router.put('/rename', renameFileInBucket);
router.get('/deleted-files', showDeletedFilesInBucket);

export default router;
