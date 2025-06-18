import { Storage } from '@google-cloud/storage'; // Function to delete a file from the bucket
import { getTenantDb } from '../config/db.js';
import invoiceSchema from '../models/Invoice.js';
import clientSchema from '../models/Client.js';
import notificationSchema from '../models/Notification.js';
import proposalSchema from '../models/Proposal.js';
import { emitNotification } from '../index.js';
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

    // if (files.length === 0) {
    //   return res.status(404).json({ message: 'No files found in the bucket' });
    // }
    // // If you want to return all files without organizing them into folders
    // const fileList = await Promise.all(
    //   files.map(async (file) => {
    //     const [url] = await file.getSignedUrl({
    //       action: 'read',
    //       expires: Date.now() + 15 * 60 * 1000, // URL valid for 15 minutes
    //     });

    //     return {
    //       name: file.name,
    //       size: file.metadata.size,
    //       contentType: file.metadata.contentType,
    //       updated: file.metadata.updated,
    //       url,
    //       isFolder: file.name.endsWith('/'),
    //     };
    //   })
    // );

    // res.json(fileList);

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
    res.json({ folders, organized, allFiles: fileList });
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
    const prefix = `${req.tenantId}/`;

    const sanitizedFilename = filename.replace(/\.pdf$/, '');

    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: `${prefix}`,
    });

    let matchingFiles;
    if (sanitizedFilename.includes('_signed')) {
      matchingFiles = files.filter((f) => f.name === `${sanitizedFilename}.pdf`);
    } else {
      matchingFiles = files.filter((f) => f.name === `${sanitizedFilename}.pdf` || f.name === `${sanitizedFilename}_signed.pdf`);
    }

    await Promise.all(matchingFiles.map((f) => f.delete()));

    const fileUrlRegex = new RegExp(`${sanitizedFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

    const invoices = await Invoice.find({
      $or: [{ fileUrl: { $regex: fileUrlRegex } }, { signedPdfUrl: { $regex: fileUrlRegex } }],
    });
    const proposals = await Proposal.find({
      $or: [{ fileUrl: { $regex: fileUrlRegex } }, { signedPdfUrl: { $regex: fileUrlRegex } }],
    });

    for (const invoice of invoices) {
      let updated = false;
      if (fileUrlRegex.test(invoice.fileUrl)) {
        invoice.fileUrl = '';
        invoice.status = 'created';
        updated = true;
      }
      if (fileUrlRegex.test(invoice.signedPdfUrl)) {
        invoice.signedPdfUrl = '';
        invoice.status = 'sent';
        updated = true;
      }
      if (updated) await invoice.save();

      const client = await Client.findById(invoice.client);
      if (client) {
        client.statusHistory.push({
          status: `invoice ${invoice.status}`,
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
        emitNotification(req.tenantId, notification);
      }
    }

    for (const proposal of proposals) {
      let updated = false;
      if (fileUrlRegex.test(proposal.fileUrl)) {
        proposal.fileUrl = '';
        proposal.status = 'created';
        updated = true;
      }
      if (fileUrlRegex.test(proposal.signedPdfUrl)) {
        proposal.signedPdfUrl = '';
        proposal.status = 'sent';
        updated = true;
      }
      if (updated) await proposal.save();

      const client = await Client.findById(proposal.client);
      if (client) {
        client.statusHistory.push({
          status: `proposal ${proposal.status}`,
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
        emitNotification(req.tenantId, notification);
      }
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file from bucket:', error.message);
    res.status(500).json({ error: 'Failed to delete file from bucket' });
  }
};
export const showDeletedFilesInBucket = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const bucketName = `invoicesproposals`;
    const prefix = `${req.tenantId}/`;

    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: `${prefix}`,
      autoPaginate: false,
      versions: true, // Fetch all versions of the files
    });

    const deletedFiles = files.filter((file) => file.metadata.deleted);

    if (deletedFiles.length === 0) {
      return res.status(404).json({ message: 'No deleted files found' });
    }

    const fileList = await Promise.all(
      deletedFiles.map(async (file) => {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
        });

        return {
          name: file.name,
          size: file.metadata.size,
          contentType: file.metadata.contentType,
          updated: file.metadata.updated,
          url,
          isFolder: file.name.endsWith('/'),
        };
      })
    );

    res.json(fileList);
  } catch (error) {
    console.error('Error listing deleted files from bucket:', error.message);
    res.status(500).json({ error: 'Failed to list deleted files from bucket' });
  }
};
