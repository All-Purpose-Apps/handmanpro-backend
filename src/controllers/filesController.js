import { Storage } from '@google-cloud/storage';

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
