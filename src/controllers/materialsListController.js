import MaterialsList from '../models/MaterialsList.js';
import Materials from '../models/Materials.js';

export const listOfMaterials = async (req, res) => {
  try {
    const materials = await Materials.find();
    res.status(200).json(materials);
  } catch (error) {
    res.status(404).json({ message: error.message });
    console.error('Error fetching materials:', error);
  }
};

export const getMaterialsList = async (req, res) => {
  try {
    const materialsList = await MaterialsList.find();
    res.status(200).json(materialsList);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createMaterialsList = async (req, res) => {
  const materialsList = req.body;
  const newMaterialsList = new MaterialsList(materialsList);
  try {
    await newMaterialsList.save();
    res.status(201).json(newMaterialsList);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const deleteMaterialsList = async (req, res) => {
  const { id } = req.params;
  try {
    await MaterialsList.findByIdAndRemove(id);
    res.json({ message: 'Materials list deleted successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const updateMaterialsList = async (req, res) => {
  const { id } = req.params;
  const { proposal, materials, total } = req.body;
  try {
    await MaterialsList.findByIdAndUpdate(id, { proposal, materials, total }, { new: true });
    res.json({ message: 'Materials list updated successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const getMaterialsListById = async (req, res) => {
  const { id } = req.params;
  try {
    const materialsList = await MaterialsList.findById(id);
    res.status(200).json(materialsList);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getMaterialsListByProposal = async (req, res) => {
  const { proposalId } = req.params;
  try {
    const materialsList = await MaterialsList.find({ proposal: proposalId });
    res.status(200).json(materialsList);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
