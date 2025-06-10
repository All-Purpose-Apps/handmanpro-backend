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

export const getFilesFromBucket = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const bucketName = `invoicesproposals`;

    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: `${req.tenantId}/`,
    });

    const tenantPrefix = `${req.tenantId}/`;
    const folderSet = new Set();
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

        const relativePath = file.name.substring(tenantPrefix.length);
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          const folderName = parts[0];
          folderSet.add(folderName);
          if (!folderMap.has(folderName)) folderMap.set(folderName, []);
          folderMap.get(folderName).push(fileData);
        } else {
          if (!folderMap.has('root')) folderMap.set('root', []);
          folderMap.get('root').push(fileData);
        }

        return fileData;
      })
    );

    const folders = Array.from(folderSet);
    const organized = {};
    for (const [folder, contents] of folderMap.entries()) {
      organized[folder] = contents;
    }
    res.json({ folders, organized });
  } catch (error) {
    console.error('Error listing files from bucket:', error.message);
    res.status(500).json({ error: 'Failed to list files from bucket' });
  }
};

export const deleteFileFromBucket = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Invoice = db.models.Invoice || db.model('Invoice', invoiceSchema);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);
    const { filename } = req.query;
    const bucketName = `invoicesproposals`;
    const filePath = `${req.tenantId}/${filename}`;
    const file = storage.bucket(bucketName).file(filePath);
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    await file.delete();

    const invoices = await Invoice.find({
      $or: [{ fileUrl: { $regex: fileUrl } }, { signedPdfUrl: { $regex: fileUrl } }],
    });
    const proposals = await Proposal.find({
      $or: [{ fileUrl: { $regex: fileUrl } }, { signedPdfUrl: { $regex: fileUrl } }],
    });

    for (const invoice of invoices) {
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
