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

export const createMaterialsList = async (req, res) => {
  const { proposal, total, materials } = req.body;
  try {
    const newMaterialsList = new MaterialsList({
      proposal,
      total,
      materials,
    });

    const savedMaterialsList = await newMaterialsList.save();
    res.status(201).json(savedMaterialsList);
  } catch (error) {
    res.status(400).json({ message: error.message });
    console.error('Error creating materials list:', error);
  }
};

export const getMaterialsListByProposalNumber = async (req, res) => {
  const { proposal } = req.params;
  try {
    const materialsList = await MaterialsList.findOne({ proposal: proposal }).populate('materials.material', 'name price').populate('proposalId', 'title');
    if (!materialsList) {
      return res.status(404).json({ message: 'Materials list not found for this proposal.' });
    }
    res.status(200).json(materialsList);
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error('Error fetching materials list by proposal:', error);
  }
};
