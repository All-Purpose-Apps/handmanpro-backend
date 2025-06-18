import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import { getTenantDb } from '../config/db.js';
import clientSchema from '../models/Client.js';
import invoiceSchema from '../models/Invoice.js';
import proposalSchema from '../models/Proposal.js';
import notificationSchema from '../models/Notification.js';
import { emitNotification } from '../index.js';

const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

const storage = new Storage({
  credentials: gcsCredentials,
});
const bucketName = 'invoicesproposals'; // Replace with your bucket name

const extractFilenameFromUrl = (url) => {
  return url.replace('https://storage.googleapis.com/invoicesproposals/', '').split('?')[0];
};

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
        const name = contact.names ? contact.names[0].givenName + ' ' + contact.names[0].familyName : '';
        const givenName = contact.names ? contact.names[0].givenName : '';
        const familyName = contact.names ? contact.names[0].familyName : '';
        const email = contact.emailAddresses ? contact.emailAddresses[0].value : '';
        const phone = contact.phoneNumbers ? contact.phoneNumbers[0].value : '';
        const address = contact.addresses ? contact.addresses[0].formattedValue : '';
        return { resourceName, name, email, phone, address, givenName, familyName };
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

    const db = await getTenantDb(req.tenantId);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);

    const notification = new Notification({
      title: 'Contact Created',
      message: `Contact ${givenName} ${familyName} was successfully created.`,
      type: 'contacts',
    });
    await notification.save();
    emitNotification(req.tenantId, notification);

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
  const db = await getTenantDb(req.tenantId);
  const Client = db.models.Client || db.model('Client', clientSchema);
  const Invoice = db.models.Invoice || db.model('Invoice', invoiceSchema);
  const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);

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

    // // Delete the client from MongoDB and retrieve it
    const client = await Client.findOneAndDelete({ _id: id });
    if (!client) {
      return res.status(404).json({ msg: 'Client not found in MongoDB' });
    }

    // Delete all invoices associated with the client
    const invoices = await Invoice.find({ client: client._id });
    for (const invoice of invoices) {
      // Remove the fileUrl from the invoice
      if (invoice.fileUrl) {
        const filename = extractFilenameFromUrl(invoice.fileUrl);
        const file = storage.bucket(bucketName).file(filename);
        await file.delete();
      }

      if (invoice.signedPdfUrl) {
        const filename = extractFilenameFromUrl(invoice.signedPdfUrl);
        const signedFile = storage.bucket(bucketName).file(filename);
        await signedFile.delete();
      }
      await Invoice.deleteOne({ _id: invoice._id });
    }
    const proposals = await Proposal.find({ client: client._id });

    for (const proposal of proposals) {
      if (proposal.fileUrl) {
        const filename = extractFilenameFromUrl(proposal.fileUrl);
        const file = storage.bucket(bucketName).file(filename);
        await file.delete();
      }
      if (proposal.signedPdfUrl) {
        const filename = extractFilenameFromUrl(proposal.signedPdfUrl);
        const signedFile = storage.bucket(bucketName).file(filename);

        await signedFile.delete();
      }
      await Proposal.deleteOne({ _id: proposal._id });
    }

    const notification = new Notification({
      title: 'Contact Deleted',
      message: `Contact ${client.name} has been deleted along with associated invoices and proposals.`,
      type: 'contacts',
      id: client._id,
    });
    await notification.save();
    emitNotification(req.tenantId, notification);

    res.json({ msg: 'Contact, client, invoices, and proposals deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).send('Server Error');
  }
};
