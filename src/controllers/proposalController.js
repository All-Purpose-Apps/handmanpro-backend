import Proposal from '../models/Proposal.js';

// Create a new proposal
export const createProposal = async (req, res) => {
  try {
    const proposal = new Proposal(req.body);
    await proposal.save();
    res.status(201).send(proposal);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Read all proposals
export const getAllProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({});
    res.status(200).send(proposals);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Read a single proposal by ID
export const getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).send();
    }
    res.status(200).send(proposal);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Update a proposal by ID
export const updateProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!proposal) {
      return res.status(404).send();
    }
    res.status(200).send(proposal);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Delete a proposal by ID
export const deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) {
      return res.status(404).send();
    }
    res.status(200).send({ message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
};
