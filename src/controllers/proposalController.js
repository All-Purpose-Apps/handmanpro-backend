import { getTenantDb } from '../config/db.js';
import proposalSchema from '../models/Proposal.js';

import jwt from 'jsonwebtoken';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PassThrough } from 'stream';
import { Storage } from '@google-cloud/storage';
import { formatPhoneNumber } from '../utils/formatPhoneNumber.js';
import clientSchema from '../models/Client.js';
import materialsListSchema from '../models/MaterialsList.js';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import notificationSchema from '../models/Notification.js';
import Token from '../models/Token.js';
const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Set expiration time
  revoked: { type: Boolean, default: false }, // Flag for revocation
});

// Create a new proposal
export const createProposal = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema).populate('client');
    const Client = db.models.Client || db.model('Client', clientSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);
    const proposal = new Proposal(req.body);
    await proposal.save();

    // Update the client's proposals array
    let client = {};
    const clientId = proposal.client;
    if (clientId) {
      client = await Client.findById(clientId);
      if (client) {
        client.proposals.push(proposal._id);
        client.statusHistory.push({
          status: 'proposal created',
          date: new Date(),
        });
        await client.save();
      }
    }

    // Create a notification for the proposal creation
    const notification = new Notification({
      title: 'New Proposal Created',
      message: `Proposal ${proposal.proposalNumber} has been created for client ${client.name}`,
      type: 'proposals',
      id: proposal._id,
    });

    await notification.save();

    // const proposals = await Proposal.find({}).populate('client');
    console.log('Proposal created:', proposal);
    res.status(201).send(await proposal);
  } catch (error) {
    console.log('Error creating proposal:', error);
    res.status(400).send(error);
  }
};

// Read all proposals
export const getAllProposals = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const proposals = await Proposal.find({}).populate('client');
    res.status(200).send(proposals);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Read a single proposal by ID
export const getProposalById = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const proposal = await Proposal.findById(req.params.id).populate('client');
    if (!proposal) {
      return res.status(404).send();
    }
    res.status(200).send(proposal);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Update a proposal by ID

export const updateProposal = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const proposalId = req.params.id;
    const updateData = req.body;

    // Fetch the existing proposal
    const existingProposal = await Proposal.findById(proposalId);
    if (!existingProposal) {
      return res.status(404).send({ message: 'Proposal not found' });
    }

    // Safely retrieve client IDs
    const oldClientId = existingProposal.client ? existingProposal.client.toString() : null;
    const newClientId = updateData.client ? updateData.client._id.toString() : oldClientId;
    // Update the proposal
    const proposal = await Proposal.findByIdAndUpdate(proposalId, updateData, {
      new: true,
      runValidators: true,
    });

    // If the client has changed

    if (oldClientId && newClientId && oldClientId !== newClientId) {
      // Remove proposal from old client's proposals array
      const oldClient = await Client.findById(oldClientId);
      if (oldClient) {
        oldClient.proposals.pull(proposalId);
        await oldClient.save();
      }
      // Add proposal to new client's proposals array
      const newClient = await Client.findById(newClientId);
      if (newClient) {
        newClient.proposals.push(proposalId);
        await newClient.save();
      }
    }

    res.status(200).send(proposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(400).send({ message: error.message });
  }
};

// Delete a proposal by ID
export const deleteProposal = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const MaterialsList = db.models.MaterialsList || db.model('MaterialsList', materialsListSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);
    const proposal = await Proposal.findById(req.params.id).populate('client');
    if (!proposal) {
      return res.status(404).send();
    }

    // Attempt to delete proposal PDF from GCS
    try {
      const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
      const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));
      const storage = new Storage({ credentials: gcsCredentials });
      const bucketName = 'invoicesproposals';

      if (proposal.proposalNumber && proposal.client?.name) {
        const filePath = `${req.tenantId}/proposals/proposal_${proposal.proposalNumber}_${proposal.client.name}.pdf`;
        const file = storage.bucket(bucketName).file(filePath);
        await file.delete().catch((err) => {
          console.error('Error deleting proposal PDF from GCS:', err.message);
        });
      }
      if (proposal.signedPdfUrl) {
        const signedFilePath = `${req.tenantId}/proposals/proposal_${proposal.proposalNumber}_${proposal.client.name}_signed.pdf`;
        const signedFile = storage.bucket(bucketName).file(signedFilePath);
        await signedFile.delete().catch((err) => {
          console.error('Error deleting signed proposal PDF from GCS:', err.message);
        });
      }
    } catch (err) {
      console.error('GCS cleanup failed:', err.message);
    }

    // Delete the proposal document itself
    await Proposal.findByIdAndDelete(req.params.id);

    // Delete associated materials list if exists
    if (proposal.materialsListId) {
      try {
        await MaterialsList.findByIdAndDelete(proposal.materialsListId);
      } catch (err) {
        console.error('Error deleting materials list:', err.message);
      }
    }

    // Remove the proposal from the client's proposals array and update status history
    if (proposal.client) {
      const client = await Client.findById(proposal.client);
      if (client) {
        client.proposals.pull(proposal._id);
        client.statusHistory.push({
          status: 'proposal deleted',
          date: new Date(),
        });
        await client.save();
      }
    }

    const notification = new Notification({
      title: 'Proposal Deleted',
      message: `Proposal ${proposal.proposalNumber} has been deleted`,
      type: 'proposals',
      id: proposal._id,
    });
    await notification.save();

    return res.status(200).send({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Unhandled error in deleteProposal:', error.message);
    return res.status(500).send({ error: error.message });
  }
};

export const createProposalPdf = async (req, res) => {
  try {
    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const MaterialsList = db.models.MaterialsList || db.model('MaterialsList', materialsListSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);
    // Parse credentials from environment variable
    const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
    const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

    const client = await Client.findById(req.body.proposal.client._id).populate('proposals');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    // Check if the client has reached the maximum number of proposals

    // Initialize Google Cloud Storage client
    const storage = new Storage({
      credentials: gcsCredentials,
    });

    // Download the PDF template from Google Cloud Storage
    const templateBucketName = 'handmanpro-c29ca.appspot.com';
    const templateFileName = 'ProposalTemplate.pdf';

    // Access the template file in Cloud Storage
    const templateFile = storage.bucket(templateBucketName).file(templateFileName);

    // Download the template file
    const [templateContents] = await templateFile.download();

    // Load the PDFDocument
    const pdfDoc = await PDFDocument.load(templateContents);

    // Fetch the proposal and populate the client information
    const proposal = req.body.proposal;
    let materialList = null;

    if (proposal.materialsListId) {
      materialList = await MaterialsList.findOne({ _id: proposal.materialsListId }).populate('materials.material', 'name price');
    }
    // Get the form from the PDF template and fill it with proposal data
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Load fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // **Client Information**
    const clientNameField = form.getTextField('Proposal Name');
    clientNameField.setText(`${proposal.client.name}` || 'N/A');
    clientNameField.updateAppearances(fontBold);

    form.getTextField('Proposal Address').setText(proposal.client.address || 'N/A');
    form.getTextField('Proposal Telephone').setText(formatPhoneNumber(proposal.client.phone) || 'N/A');
    form.getTextField('Proposal Email').setText(proposal.client.email || 'N/A');

    // **Work At Information**
    form.getTextField('Work At Name').setText(proposal.client.name || 'N/A');
    form.getTextField('Work At Address').setText(proposal.client.address || 'N/A');
    form.getTextField('Work At Telephone').setText(formatPhoneNumber(proposal.client.phone) || 'N/A');
    form.getTextField('Work At Email').setText(proposal.client.email || 'N/A');

    // **Proposal Information**
    firstPage.drawText(proposal.proposalNumber || 'N/A', {
      x: 520,
      y: 695,
      size: 20,
      font: fontBold,
      color: rgb(0.75, 0, 0),
    });

    const dateField = form.getTextField('Date');
    dateField.setText(proposal.proposalDate ? new Date(proposal.proposalDate).toLocaleDateString() : 'N/A');
    dateField.updateAppearances(fontBold);
    dateField.setAlignment(1);

    // **Proposal Items**
    let descriptionX = 40; // X position for descriptions column
    let regularPriceX = 450; // X position for regular prices column
    let discountPriceX = 510; // X position for discount prices column
    let startingY = 500; // Y position for the first item (adjust as necessary)
    let lineHeight = 20; // Line height between each row

    // Draw the descriptions, regular prices, and discount prices on the PDF
    proposal.items.forEach((item, index) => {
      // Draw item description in the first column
      firstPage.drawText(item.description || 'N/A', {
        x: descriptionX,
        y: startingY - index * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Draw item regular price in the second column
      firstPage.drawText(item.regularPrice ? item.regularPrice.toFixed(2) : '0.00', {
        x: regularPriceX,
        y: startingY - index * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Draw item discount price in the third column
      firstPage.drawText(item.discountPrice ? item.discountPrice.toFixed(2) : '0.00', {
        x: discountPriceX,
        y: startingY - index * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
    });
    if (materialList) {
      firstPage.drawText('Materials', {
        x: descriptionX,
        y: startingY - proposal.items.length * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      firstPage.drawText(materialList.total ? materialList.total.toFixed(2) : '0.00', {
        x: regularPriceX,
        y: startingY - proposal.items.length * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      firstPage.drawText(materialList.discountTotal ? materialList.discountTotal.toFixed(2) : '0.00', {
        x: discountPriceX,
        y: startingY - proposal.items.length * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
    }
    // **Totals**
    const packagePriceField = form.getTextField('Package Price');
    packagePriceField.setText(proposal.packagePrice ? proposal.packagePrice.toFixed(2) : '0.00');
    packagePriceField.setFontSize(18);
    packagePriceField.setAlignment(1);

    // **Additional Information**
    const customerPrintName = form.getTextField('Customer Print Name');
    customerPrintName.setText(proposal.client.name || 'N/A');
    customerPrintName.setFontSize(16);
    customerPrintName.setAlignment(1);

    // form.getTextField('Date Accepted').setText(proposal.dateAccepted ? new Date(proposal.dateAccepted).toLocaleDateString() : 'N/A');

    // Signature field, if needed
    // Blank space for a manual signature

    // Flatten the form so the fields are no longer editable
    form.flatten();

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Upload the generated PDF to Google Cloud Storage
    const bucketName = 'invoicesproposals';
    const objectName = `${req.tenantId}/proposals/proposal_${proposal.proposalNumber}_${proposal.client.name}.pdf`;

    // Convert pdfBytes (Uint8Array) to a readable stream
    const bufferStream = new PassThrough();
    bufferStream.end(Buffer.from(pdfBytes));

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    // Upload the PDF to Google Cloud Storage
    await file.save(pdfBytes, {
      metadata: {
        contentType: 'application/pdf',
      },
      predefinedAcl: 'publicRead', // Makes the file publicly accessible
    });

    // Construct the public URL with cache-busting query string
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${new Date().getTime()}`;

    client.statusHistory.push({
      status: 'proposal pdf created',
      date: new Date(),
    });
    await client.save();

    const notification = new Notification({
      title: 'Proposal PDF Created',
      message: `Proposal PDF for ${proposal.proposalNumber} has been created successfully.`,
      type: 'proposals',
      id: proposal._id,
    });
    await notification.save();

    // Return the URL as the response
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error creating proposal PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- Token-related functions for proposals ---
export const createProposalToken = async (req, res) => {
  try {
    // Use tenant-specific Proposal, but derive tenantId from JWT if needed
    const { proposalId, data } = req.body;
    const { proposalUrl } = data;
    // Derive tenantId from token if req.tenantId is not available
    const decoded = jwt.decode(data.token || '', { complete: false });
    const tenantId = decoded?.tenantId || req.tenantId;
    const db = await getTenantDb(tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    // Use the global Token model, already imported at the top
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }
    const tokenData = {
      proposalId: proposal._id,
      proposalNumber: proposal.proposalNumber,
      proposalUrl,
      signed: false,
      tenantId, // Include tenantId in the payload
    };

    const tokenString = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '2d' });
    const tokenDoc = new Token({
      token: tokenString,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      revoked: false,
    });

    await tokenDoc.save();
    proposal.token = tokenDoc._id;
    await proposal.save();
    res.status(200).json({ token: tokenString });
  } catch (error) {
    console.error('Error in createProposalToken:', error);
    res.status(400).json({ message: error.message });
  }
};

export const verifyProposalToken = async (req, res) => {
  try {
    const { token } = req.body;

    // Use the global Token model, already imported at the top
    const tokenDoc = await Token.findOne({ token });

    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (tokenDoc.revoked) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Token has expired' });
    }
    // After verifying the token, derive tenantId and get tenant DB context
    const decoded = jwt.decode(token);
    const tenantId = decoded?.tenantId;

    const db = await getTenantDb(tenantId);
    // Optionally use Proposal model if needed after verification
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decodedPayload) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      res.status(200).json(decodedPayload);
    });
  } catch (error) {
    console.error('Error verifying proposal token:', error);
    res.status(400).json({ message: error.message });
  }
};

export const revokeProposalToken = async (req, res) => {
  try {
    const { token } = req.body;
    // Use the global Token model, already imported at the top
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.status(404).json({ message: 'Token not found' });
    }
    // Derive tenantId from token and get tenant DB context
    const decoded = jwt.decode(token);
    const tenantId = decoded?.tenantId;
    const db = await getTenantDb(tenantId);
    // Optionally use Proposal model if needed after revocation
    tokenDoc.revoked = true;
    await tokenDoc.save();
    res.status(200).json({ message: 'Token revoked successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Download a signed proposal PDF from a URL and serve it to the client
export const downloadProposalPdf = async (req, res) => {
  try {
    // Extract tenantId from the token before loading the proposal model
    // Use the global Token model, already imported at the top
    const token = req.headers.authorization?.split(' ')[1];
    const tokenDoc = await Token.findOne({ token: token });
    if (!tokenDoc) {
      return res.status(404).json({ message: 'Token not found' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const tenantId = decoded.tenantId;
    const db = await getTenantDb(tenantId);
    const url = Object.keys(req.query);
    if (!url) {
      return res.status(400).send('Missing PDF URL');
    }
    const tempDir = path.resolve('temp');
    const fileName = `proposal_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);
    await fs.ensureDir(tempDir);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const fileStream = fs.createWriteStream(filePath);
    response.body.pipe(fileStream);
    fileStream.on('finish', () => {
      res.sendFile(filePath, (err) => {
        if (err) {
          res.status(500).send('Error sending the PDF');
        }
        fs.remove(filePath).catch(() => {});
      });
    });
    fileStream.on('error', (err) => {
      res.status(500).send('Error downloading the PDF');
    });
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
};

// Embed a signature into a proposal PDF and re-upload it to Google Cloud Storage
export const uploadProposalWithSignature = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.body.token;

    const tokenDoc = await Token.findOne({ token: token });
    if (!tokenDoc) {
      return res.status(404).json({ message: 'Token not found' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const tenantId = decoded.tenantId;
    const db = await getTenantDb(tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);
    const { pdfUrl, signatureImage, proposalNumber, proposalId } = req.body;

    const proposal = await Proposal.findById(proposalId).populate('client');
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    if (!pdfUrl || !signatureImage) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    proposal.dateAccepted = formattedDate;
    const signatureData = signatureImage.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(signatureData, 'base64');

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const signatureImageEmbed = await pdfDoc.embedPng(signatureBuffer);
    const signatureDims = signatureImageEmbed.scale(0.5);
    const firstPage = pdfDoc.getPages()[0];

    firstPage.drawImage(signatureImageEmbed, {
      x: 350,
      y: 220,
      width: signatureDims.width / 5,
      height: signatureDims.height / 5,
    });

    firstPage.drawText(proposal.dateAccepted, {
      x: 380,
      y: 165,
      size: 14,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    const updatedPdfBytes = await pdfDoc.save();

    const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
    const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

    const storage = new Storage({ credentials: gcsCredentials });
    const bucketName = 'invoicesproposals';
    const objectName = `${tenantId}/proposals/proposal_${proposalNumber}_${proposal.client.name}_signed.pdf`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(Buffer.from(updatedPdfBytes), {
      metadata: { contentType: 'application/pdf' },
      predefinedAcl: 'publicRead',
    });

    proposal.signedPdfUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${new Date().getTime()}`;
    proposal.status = 'accepted';
    await proposal.save();

    if (proposal.token) {
      // Use the global Token model, already imported at the top
      const tokenDoc = await Token.findById(proposal.token);
      if (tokenDoc) {
        tokenDoc.revoked = true;
        await tokenDoc.save();
      }
    }

    // update the client status history
    const client = await Client.findById(proposal.client);
    if (client) {
      client.statusHistory.push({
        status: 'proposal signed',
        date: new Date(),
      });
      await client.save();
    }

    const notification = new Notification({
      title: 'Proposal Signed',
      message: `Proposal ${proposal.proposalNumber} has been signed`,
      type: 'proposals',
      id: proposal._id,
    });

    await notification.save();

    res.json({ url: proposal.signedPdfUrl, signedProposal: proposal });
  } catch (error) {
    console.error('Error embedding signature into proposal PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

// Internal upload with signature for admin or internal use
export const internalUploadProposalWithSignature = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { signature } = req.body;

    if (!proposalId) {
      return res.status(400).json({ message: 'Missing proposal ID' });
    }

    const db = await getTenantDb(req.tenantId);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);

    const proposal = await Proposal.findById(proposalId).populate('client');
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    proposal.dateAccepted = formattedDate;

    // Fetch the signature from proposal.signature (base64 string)
    const signatureData = signature?.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(signatureData, 'base64');

    // Fetch the PDF from proposal.pdfUrl

    const response = await fetch(proposal.fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch original PDF: ${response.statusText}`);
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const signatureEmbed = await pdfDoc.embedPng(signatureBuffer);
    const signatureDims = signatureEmbed.scale(0.5);
    const firstPage = pdfDoc.getPages()[0];

    firstPage.drawImage(signatureEmbed, {
      x: 350,
      y: 220,
      width: signatureDims.width / 5,
      height: signatureDims.height / 5,
    });

    firstPage.drawText(formattedDate, {
      x: 380,
      y: 165,
      size: 14,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    const updatedPdfBytes = await pdfDoc.save();
    const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
    const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));
    const storage = new Storage({ credentials: gcsCredentials });
    const bucketName = 'invoicesproposals';
    const objectName = `proposals/proposal_${proposal.proposalNumber}_${proposal.client.name}_signed.pdf`;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(Buffer.from(updatedPdfBytes), {
      metadata: { contentType: 'application/pdf' },
      predefinedAcl: 'publicRead',
    });

    proposal.signedPdfUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${Date.now()}`;
    proposal.status = 'accepted';
    await proposal.save();

    const client = await Client.findById(proposal.client);
    if (client) {
      client.statusHistory.push({
        status: 'proposal signed',
        date: new Date(),
      });
      await client.save();
    }

    const notification = new Notification({
      title: 'Proposal Signed Internally',
      message: `Proposal ${proposal.proposalNumber} has been signed internally`,
      type: 'proposals',
      id: proposal._id,
    });

    await notification.save();

    res.json({ url: proposal.signedPdfUrl, signedProposal: proposal });
  } catch (error) {
    console.error('Error in internalUploadProposalWithSignature:', error);
    res.status(500).json({ message: error.message });
  }
};
