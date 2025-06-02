import MaterialsList from '../models/MaterialsList.js';
import Materials from '../models/Materials.js';

export const listOfMaterials = async (req, res) => {
  try {
    console.log('Fetching all materials from the database...');
    const materials = await Materials.find();
    res.status(200).json(materials);
  } catch (error) {
    res.status(404).json({ message: error.message });
    console.error('Error fetching materials:', error);
  }
};

export const addMaterialToList = async (req, res) => {
  const { name, price } = req.body;
  try {
    const existingMaterial = await Materials.find({ name: name });
    if (existingMaterial.length > 0) {
      return res.status(400).json({ message: 'Material already exists.' });
    }
    const newMaterial = new Materials({ name, price });
    const savedMaterial = await newMaterial.save();
    res.status(201).json(savedMaterial);
  } catch (error) {
    res.status(400).json({ message: error.message });
    console.error('Error adding material:', error);
  }
};

export const deleteMaterialFromList = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMaterial = await Materials.findByIdAndDelete(id);
    if (!deletedMaterial) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    res.status(200).json({ message: 'Material deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error('Error deleting material:', error);
  }
};

export const updateMaterialInList = async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  console.log('Updating material with ID:', id, 'Name:', name, 'Price:', price);

  try {
    const existingMaterial = await Materials.findById(id);
    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    const updatedMaterial = await Materials.findByIdAndUpdate(id, { name, price }, { new: true });
    res.status(200).json(updatedMaterial);
  } catch (error) {
    res.status(400).json({ message: error.message });
    console.error('Error updating material:', error);
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

  if (!proposal || proposal === 'null') {
    console.warn('getMaterialsListByProposalNumber: Missing or invalid proposal identifier.');
    return res.status(200).json(null);
  }

  try {
    const materialsList = await MaterialsList.findOne({ proposal: proposal }).populate('materials.material', 'name price').populate('proposalId', 'title');

    if (!materialsList) {
      return res.status(200).json(null);
    }

    res.status(200).json(materialsList);
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error('Error fetching materials list by proposal:', error);
  }
};

export const updateMaterialsList = async (req, res) => {
  const { id } = req.params;
  console.log('Updating materials list for proposal:', id);

  if (!id || id === 'null') {
    console.warn('updateMaterialsList: Missing or invalid ID, returning empty result.');
    return res.status(200).json(null);
  }

  const { materials, total, discountTotal } = req.body;

  try {
    const updatedMaterialsList = await MaterialsList.findOneAndUpdate({ _id: id }, { materials, total, discountTotal, updatedAt: new Date() }, { new: true });

    if (!updatedMaterialsList) {
      return res.status(404).json({ message: 'Materials list not found for this proposal.' });
    }

    res.status(200).json(updatedMaterialsList);
  } catch (error) {
    res.status(400).json({ message: error.message });
    console.error('Error updating materials list:', error);
  }
};

export const deleteMaterialsList = async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null') {
    console.warn('deleteMaterialsList: Missing or invalid ID, returning empty result.');
    return res.status(200).json(null);
  }

  // Ensure the id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.warn('deleteMaterialsList: Invalid ObjectId format, returning empty result.');
    return res.status(200).json(null);
  }

  try {
    const deletedMaterialsList = await MaterialsList.findByIdAndDelete(id);

    if (!deletedMaterialsList) {
      return res.status(404).json({ message: 'Materials list not found for this proposal.' });
    }

    res.status(200).json({ message: 'Materials list deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error('Error deleting materials list:', error);
  }
};

export const getMaterialsListById = async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null') {
    return res.status(200).json(null);
  }

  try {
    const materialsList = await MaterialsList.findById(id).populate('materials.material', 'name price').populate('proposalId', 'title');

    if (!materialsList) {
      return res.status(200).json(null);
    }

    res.status(200).json(materialsList);
  } catch (error) {
    console.error('Error fetching materials list by ID:', error);
    return res.status(500).json({ message: error.message });
  }
};
