import { google } from 'googleapis';
import { getTenantDb } from '../config/db.js';
import { getModels } from '../utils/modelUtils.js';
const people = google.people('v1');

const getClients = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const { Client } = getModels(db);

  try {
    const clients = await Client.find().lean();
    res.json(clients);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const createClient = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const { Client } = getModels(db);

  try {
    const { phone } = req.body;
    const existingClient = await Client.findOne({ phone });
    if (existingClient) {
      return res.status(400).json({ msg: 'Client already exists' });
    }

    const client = new Client(req.body);

    await client.save();

    res.json(client);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

const updateClient = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const { Client } = getModels(db);

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
  const db = await getTenantDb(req.tenantId);
  const { Client } = getModels(db);

  const { id } = req.params;

  try {
    let client = await Client.findById(id).populate('invoices').populate('proposals').lean();
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const deleteClient = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const { Client, Invoice } = getModels(db);

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
  const db = await getTenantDb(req.tenantId);
  const { Client, Invoice, Proposal } = getModels(db);

  try {
    const mongoClients = await Client.find().select('resourceName invoices proposals').lean();
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
        if (client[key]) {
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

    const updatedClients = await Client.find().lean();
    res.json(updatedClients);
  } catch (error) {
    console.error('Error synchronizing clients:', error);
    res.status(500).send('Server Error');
  }
};

const clearClientStatusHistory = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const { Client } = getModels(db);

  console.log('Clearing client status history');
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ msg: 'Client ID is required' });
  }
  try {
    const client = await Client.findById(clientId).select('statusHistory').exec();
    if (!client) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    client.statusHistory = client.statusHistory.filter(
      (entry) => entry.status?.toLowerCase() === 'created by user' || entry.status?.toLowerCase() === 'imported from google'
    );
    await client.save();
    res.json({ msg: 'Client status history cleared except for creation/import entries' });
  } catch (error) {
    console.error('Error clearing client status history:', error);
    res.status(500).send('Server Error');
  }
};

export { getClients, createClient, updateClient, getClient, deleteClient, syncClients, clearClientStatusHistory };
