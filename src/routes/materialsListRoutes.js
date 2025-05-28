import express from 'express';
const router = express.Router();

import { listOfMaterials, createMaterialsList, getMaterialsListByProposalNumber } from '../controllers/materialsListController.js';

router.get('/get-materials', listOfMaterials);

router.post('/create-materials-list', createMaterialsList);

router.get('/get-materials-list/:proposal', getMaterialsListByProposalNumber);

export default router;
