// controllers/clientController.js

import Client from '../models/Client.js';

// @desc    Get all clients
// @route   GET /api/clients

const getClients = async (req, res) => {
  try {
    const clients = await Client.find().select('-password'); // Exclude passwords
    res.json(clients);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new client
// @route   POST /api/clients
const createClient = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if client already exists
    let client = await Client.findOne({ email });
    if (client) {
      return res.status(400).json({ msg: 'Client already exists' });
    }

    // Create a new client
    client = new Client(req.body);

    await client.save();

    res.json({ msg: 'Client created successfully', client });
  } catch (error) {
    res.status(500).send(error);
  }
};

// @desc   Update a client
// @route  PUT /api/clients/:id

const updateClient = async (req, res) => {
  const { id } = req.params;

  try {
    let client = await Client.findByIdAndUpdate(id, req.body, { new: true });
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

// @desc   Get a client
// @route  GET /api/clients/:id

const getClient = async (req, res) => {
  const { id } = req.params;

  try {
    let client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

// @desc   Delete a client
// @route  DELETE /api/clients/:id

const deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    let client = await Client.findByIdAndDelete(id);
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json({ msg: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

export { getClients, createClient, updateClient, getClient, deleteClient };
