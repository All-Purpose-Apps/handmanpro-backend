import express from 'express';
const router = express.Router();

import {
  listOfMaterials,
  createMaterialsList,
  getMaterialsListByProposalNumber,
  updateMaterialsList,
  getMaterialsListById,
  addMaterialToList,
  deleteMaterialFromList,
  updateMaterialInList,
  deleteMaterialsList,
} from '../controllers/materialsListController.js';

router.get('/get-materials', listOfMaterials);

router.post('/create-materials-list', createMaterialsList);

router.get('/get-materials-list/:proposal', getMaterialsListByProposalNumber);

router.put('/update-materials-list/:id', updateMaterialsList);

router.get('/get-materials-list-by-id/:id', getMaterialsListById);

router.post('/add-material-to-list', addMaterialToList);

router.delete('/delete-material-from-list/:id', deleteMaterialFromList);

router.put('/update-material-in-list/:id', updateMaterialInList);

router.delete('/delete-materials-list/:id', deleteMaterialsList);

export default router;
