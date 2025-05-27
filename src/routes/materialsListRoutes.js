import express from 'express';
const router = express.Router();

import {
  getMaterialsList,
  createMaterialsList,
  deleteMaterialsList,
  updateMaterialsList,
  getMaterialsListById,
  getMaterialsListByProposal,
  listOfMaterials,
} from '../controllers/materialsListController.js';

// @route   GET /api/materialsList
// @desc    Get all materialsList
router.get('/', getMaterialsList);

router.get('/get-materials', listOfMaterials);

// @route   POST /api/materialsList
// @desc    Create a new materialsList
router.post('/', createMaterialsList);

// @route   PUT /api/materialsList/:id

// @desc    Update a materialsList
router.put('/:id', updateMaterialsList);

// @route   DELETE /api/materialsList/:id
// @desc    Delete a materialsList

router.delete('/:id', deleteMaterialsList);

// @route   GET /api/materialsList/:id
// @desc    Get a materialsList by id

router.get('/:id', getMaterialsListById);

// @route   GET /api/materialsList/proposal/:id
// @desc    Get a materialsList by proposal

router.get('/proposal/:id', getMaterialsListByProposal);

export default router;
