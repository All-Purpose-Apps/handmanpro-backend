import express from 'express';
const router = express.Router();
import { getLastSynced, updateLastSynced } from '../controllers/lastSyncedController.js';

router.get('/', getLastSynced);
router.put('/:id', updateLastSynced);

export default router;
