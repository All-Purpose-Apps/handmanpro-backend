import { google } from 'googleapis';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Proposal from '../models/Proposal.js';

export const listContacts = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  const emailToFilterOut = req.query.email;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  try {
    const response = await peopleService.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers,addresses,metadata',
      pageSize: 1000,
    });

    const connections = response.data.connections || [];

    // Filter out the specified email before mapping
    const formattedContacts = connections
      .filter((contact) => !(contact.emailAddresses && contact.emailAddresses[0].value === emailToFilterOut))
      .map((contact) => {
        const resourceName = contact.resourceName;
        const name = contact.names ? contact.names[0].displayName : '';
        const email = contact.emailAddresses ? contact.emailAddresses[0].value : '';
        const phone = contact.phoneNumbers ? contact.phoneNumbers[0].value : '';
        const address = contact.addresses ? contact.addresses[0].formattedValue : '';
        return { resourceName, name, email, phone, address };
      });

    res.json(formattedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).send('Server Error');
  }
};

export const createGoogleContact = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  // Extract contact details from request body
  const { givenName, familyName, email, phone, address } = req.body;

  try {
    const response = await peopleService.people.createContact({
      requestBody: {
        names: [{ givenName, familyName }],
        emailAddresses: email ? [{ value: email }] : undefined,
        phoneNumbers: phone ? [{ value: phone }] : undefined,
        addresses: address ? [{ formattedValue: address }] : undefined,
      },
    });

    // Respond with the created contact details
    res.json({
      msg: 'Contact created successfully',
      contact: response.data,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).send('Server Error');
  }
};

export const deleteContact = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  // Extract the resourceName and id from request parameters
  const { resourceName, id } = req.query;
  if (!resourceName) {
    return res.status(400).json({ msg: 'Missing resourceName of the contact to delete' });
  }

  try {
    // Delete the contact from Google Contacts
    await peopleService.people.deleteContact({
      resourceName: resourceName,
    });

    // Delete the client from MongoDB and retrieve it
    const client = await Client.findOneAndDelete({ _id: id });
    if (!client) {
      return res.status(404).json({ msg: 'Client not found in MongoDB' });
    }

    // Delete all invoices associated with the client
    await Invoice.deleteMany({ client: client._id });

    // Delete all proposals associated with the client
    await Proposal.deleteMany({ client: client._id });

    res.json({ msg: 'Contact, client, invoices, and proposals deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).send('Server Error');
  }
};
