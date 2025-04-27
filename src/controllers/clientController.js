import e from 'express';
import Client from '../models/Client.js';
import { google } from 'googleapis';
const people = google.people('v1');

const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate('invoices');
    res.json(clients);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const createClient = async (req, res) => {
  try {
    const { phone } = req.body;
    const existingClient = await Client.find({ phone });
    if (existingClient.length > 0) {
      return res.status(400).json({ msg: 'Client already exists' });
    }

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

const updateClient = async (req, res) => {
  const { id } = req.params;
  const oauth2Client = req.oauth2Client;

  try {
    let client = await Client.findByIdAndUpdate(id, req.body, { new: true });
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }

    if (client.resourceName) {
      const resourceName = client.resourceName;

      const { data: existingContact } = await people.people.get({
        auth: oauth2Client,
        resourceName: resourceName,
        personFields: 'names,emailAddresses,phoneNumbers,addresses',
      });

      if (!existingContact.etag) {
        return res.status(400).json({ msg: 'Etag not found for the contact' });
      }

      const updateData = {
        etag: existingContact.etag,
        names: [
          {
            givenName: client.givenName,
            familyName: client.familyName,
          },
        ],
        emailAddresses: client.email ? [{ value: client.email }] : [],
        phoneNumbers: client.phone ? [{ value: client.phone }] : [],
        addresses: client.address
          ? [
              {
                formattedValue: client.address,
              },
            ]
          : [],
      };

      await people.people.updateContact({
        auth: oauth2Client,
        resourceName: resourceName,
        updatePersonFields: 'names,emailAddresses,phoneNumbers,addresses',
        requestBody: updateData,
      });
    }
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).send('Server Error');
  }
};

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

const deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    const invoices = await Invoice.find({ client: id });

    // let client = await Client.findByIdAndDelete(id);
    // if (!client) {
    //   return res.status(404).json({ msg: 'Client not found' });
    // }
    // res.json({ msg: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const syncClients = async (req, res) => {
  try {
    const mongoClients = await Client.find();
    const googleClients = req.body;

    const mongoClientIds = mongoClients.map((client) => client.resourceName);
    const googleClientIds = googleClients.map((client) => client.resourceName);

    const resourceNamesToDelete = mongoClientIds.filter((id) => !googleClientIds.includes(id));

    if (resourceNamesToDelete.length > 0) {
      const clientsToDelete = await Client.find({ resourceName: { $in: resourceNamesToDelete } });

      const invoicesToDelete = clientsToDelete.flatMap((client) => client.invoices);
      const proposalsToDelete = clientsToDelete.flatMap((client) => client.proposals);

      await Invoice.deleteMany({ _id: { $in: invoicesToDelete } });
      await Proposal.deleteMany({ _id: { $in: proposalsToDelete } });

      await Client.deleteMany({ resourceName: { $in: resourceNamesToDelete } });
    }

    const bulkOps = googleClients.map((client) => {
      const updateData = {};
      for (const key in client) {
        if (client[key] !== undefined && client[key] !== null && client[key] !== '') {
          updateData[key] = client[key];
        }
      }

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
