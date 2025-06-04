import { Storage } from '@google-cloud/storage'; // Function to delete a file from the bucket
import { getTenantDb } from '../config/db.js';
import invoiceSchema from '../models/Invoice.js';
import clientSchema from '../models/Client.js';
import notificationSchema from '../models/Notification.js';
import proposalSchema from '../models/Proposal.js';

// Load GCS credentials from environment variable (same as proposalController.js)
const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

const storage = new Storage({
  credentials: gcsCredentials,
});
const bucketName = 'invoicesproposals'; // Replace with your bucket name

export const getFilesFromBucket = async (req, res) => {
  try {
    const [files] = await storage.bucket(bucketName).getFiles();

    const folderMap = new Map();

    const fileList = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
        });

        const fileData = {
          name: file.name,
          size: file.metadata.size,
          contentType: file.metadata.contentType,
          updated: file.metadata.updated,
          url,
          isFolder: file.name.endsWith('/'),
        };

        const parts = file.name.split('/');
        if (parts.length > 1) {
          const folder = parts[0];
          if (!folderMap.has(folder)) folderMap.set(folder, []);
          folderMap.get(folder).push(fileData);
        } else {
          if (!folderMap.has('root')) folderMap.set('root', []);
          folderMap.get('root').push(fileData);
        }

        return fileData;
      })
    );

    const organized = {};
    for (const [folder, contents] of folderMap.entries()) {
      organized[folder] = contents;
    }

    res.json(organized);
  } catch (error) {
    console.error('Error listing files from bucket:', error.message);
    res.status(500).json({ error: 'Failed to list files from bucket' });
  }
};

export const deleteFileFromBucket = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Invoice = db.models.Invoice || db.model('Invoice', invoiceSchema);
  const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
  const Client = db.models.Client || db.model('Client', clientSchema);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);

  const { filename } = req.query;
  console.log('Deleting file:', filename);
  try {
    const file = storage.bucket(bucketName).file(filename);
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    await file.delete();

    // Find invoices referencing this file
    const invoices = await Invoice.find({
      $or: [{ fileUrl: { $regex: fileUrl } }, { signedPdfUrl: { $regex: fileUrl } }],
    });
    const proposals = await Proposal.find({
      $or: [{ fileUrl: { $regex: fileUrl } }, { signedPdfUrl: { $regex: fileUrl } }],
    });

    for (const invoice of invoices) {
      // Remove the fileUrl from the invoice
      invoice.fileUrl = '';
      await invoice.save();

      const client = await Client.findById(invoice.client);
      if (client) {
        client.statusHistory.push({
          status: 'invoice created',
          date: new Date(),
        });
        await client.save();
        const notification = new Notification({
          title: 'Invoice File Deleted',
          message: `Invoice ${invoice.invoiceNumber} file has been deleted from storage`,
          type: 'invoices',
          id: invoice._id,
        });
        await notification.save();
      }
    }

    for (const proposal of proposals) {
      // Remove the fileUrl from the proposal
      proposal.fileUrl = '';
      await proposal.save();

      const client = await Client.findById(proposal.client);
      if (client) {
        client.statusHistory.push({
          status: 'proposal created',
          date: new Date(),
        });
        await client.save();
        const notification = new Notification({
          title: 'Proposal File Deleted',
          message: `Proposal ${proposal.proposalNumber} file has been deleted from storage`,
          type: 'proposals',
          id: proposal._id,
        });
        await notification.save();
      }
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file from bucket:', error.message);
    res.status(500).json({ error: 'Failed to delete file from bucket' });
  }
};
// function to rename a file in the bucket
export const renameFileInBucket = async (req, res) => {
  console.log(req.body);
  const { oldFileName, newFileName } = req.body;
  console.log('Renaming file:', oldFileName, 'to', newFileName);

  try {
    const file = storage.bucket(bucketName).file(oldFileName);
    await file.move(newFileName);
    res.status(200).json({ message: 'File renamed successfully' });
  } catch (error) {
    console.error('Error renaming file in bucket:', error.message);
    res.status(500).json({ error: 'Failed to rename file in bucket' });
  }
};
