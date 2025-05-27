import Proposal from '../models/Proposal.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PassThrough } from 'stream';
import { Storage } from '@google-cloud/storage';
import { formatPhoneNumber } from '../utils/formatPhoneNumber.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';

// Create a new proposal
export const createProposal = async (req, res) => {
  try {
    const proposal = new Proposal(req.body);
    await proposal.save();

    // Update the client's proposals array
    const clientId = proposal.client;
    if (clientId) {
      const client = await Client.findById(clientId);
      if (client) {
        client.proposals.push(proposal._id);
        client.statusHistory.push({
          status: 'proposal created',
          date: new Date(),
        });
        await client.save();
      }
    }

    const proposals = await Proposal.find({}).populate('client');
    res.status(201).send(proposals);
  } catch (error) {
    console.log('Error creating proposal:', error);
    res.status(400).send(error);
  }
};

// Read all proposals
export const getAllProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({}).populate('client');
    res.status(200).send(proposals);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Read a single proposal by ID
export const getProposalById = async (req, res) => {
  try {
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

    // Convert IDs to ObjectId instances
    // const oldClientIdObj = oldClientId ? mongoose.Types.ObjectId(oldClientId) : null;
    // const newClientIdObj = newClientId ? mongoose.Types.ObjectId(newClientId) : null;

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
  console.log('Deleting proposal with ID:', req.params.id);
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) {
      return res.status(404).send();
    }

    // Remove the proposal from the client's proposals array
    const clientId = proposal.client;
    if (clientId) {
      const client = await Client.findById(clientId);
      if (client) {
        client.proposals.pull(proposal._id);
        await client.save();
      }
    }
    // Remove the proposal from the client's status history
    if (clientId) {
      const client = await Client.findById(clientId);
      console.log('Client found:', client);
      if (client) {
        client.proposals.push(proposal._id);
        client.statusHistory.push({
          status: 'proposal deleted',
          date: new Date(),
        });
        await client.save();
      }
    }

    res.status(200).send({ message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
};

export const createProposalPdf = async (req, res) => {
  try {
    // Parse credentials from environment variable
    const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
    const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

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
    const objectName = `proposals/proposal_${proposal.proposalNumber}_${proposal.client.name}.pdf`;

    console.log('Uploading file with object name:', objectName);

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

    console.log('File uploaded successfully to:', objectName);

    // Construct the public URL with cache-busting query string
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${new Date().getTime()}`;

    // Return the URL as the response
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error creating proposal PDF:', error);
    res.status(500).json({ message: error.message });
  }
};
