// controllers/clientController.js

import Client from '../models/Client.js';
import { google } from 'googleapis';

// @desc    Get all clients
// @route   GET /api/clients

const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate('invoices');
    res.json(clients);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new client
// @route   POST /api/clients
const createClient = async (req, res) => {
  try {
    const { phone } = req.body;
    const existingClient = await Client.find({ phone });
    if (existingClient.length > 0) {
      return res.status(400).json({ msg: 'Client already exists' });
    }
    // Create a new client
    const client = new Client(req.body);

    await client.save();

    const clients = await Client.find().populate('invoices').populate('proposals');

    res.json(clients);
  } catch (error) {
    console.log(error);
    pn;
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
    let client = await Client.findById(id).populate('invoices').populate('proposals');
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

const syncClients = async (req, res) => {
  try {
    // Fetch clients from MongoDB and Google Contacts
    const mongoClients = await Client.find();
    const googleClients = req.body;

    // Extract resourceNames
    const mongoClientIds = mongoClients.map((client) => client.resourceName);
    const googleClientIds = googleClients.map((client) => client.resourceName);

    // Identify clients to delete
    const resourceNamesToDelete = mongoClientIds.filter((id) => !googleClientIds.includes(id));

    // Delete clients not present in Google Contacts
    if (resourceNamesToDelete.length > 0) {
      await Client.deleteMany({ resourceName: { $in: resourceNamesToDelete } });
    }

    // Prepare bulk operations for upserting clients
    const bulkOps = googleClients.map((client) => {
      // Build the update object by excluding empty or undefined fields
      const updateData = {};
      for (const key in client) {
        if (client[key] !== undefined && client[key] !== null && client[key] !== '') {
          updateData[key] = client[key];
        }
      }
      // Exclude local-only fields from being overwritten
      delete updateData.status;
      delete updateData.notes;

      return {
        updateOne: {
          filter: { resourceName: client.resourceName },
          update: { $set: updateData },
          upsert: true,
        },
      };
    });

    // Execute bulk operations
    if (bulkOps.length > 0) {
      await Client.bulkWrite(bulkOps);
    }

    const updatedClients = await Client.find();
    res.json(updatedClients);
  } catch (error) {
    console.error('Error synchronizing clients:', error);
    res.status(500).send('Server Error');
  }
};

export { getClients, createClient, updateClient, getClient, deleteClient, syncClients };
