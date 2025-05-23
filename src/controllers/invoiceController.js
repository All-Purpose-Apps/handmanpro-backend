import Invoice from '../models/Invoice.js';
import { google } from 'googleapis';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PassThrough } from 'stream';
import { Storage } from '@google-cloud/storage';
import { formatPhoneNumber } from '../utils/formatPhoneNumber.js';
import Client from '../models/Client.js';
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import Token from '../models/Token.js';
import Notification from '../models/Notification.js';

export const createInvoice = async (req, res) => {
  try {
    // Step 1: Create and save the new invoice
    const invoice = new Invoice(req.body);
    await invoice.save();

    // Step 2: Find the related client by clientId (assuming it's in req.body)
    const client = await Client.findById(req.body.client._id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Step 3: Attach the invoice to the client's list of invoices
    client.invoices.push(invoice._id);
    await client.save();

    // Step 4: Respond with the created invoice
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all invoices
export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('client');
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single invoice by ID
export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an invoice by ID
// controllers/invoiceController.js

export const updateInvoice = async (req, res) => {
  try {
    const { prevClientId, newClientId } = req.query;
    const invoiceId = req.params.id;
    const invoiceData = req.body;

    // Step 1: Replace client with new ID in invoiceData
    invoiceData.client = newClientId;

    // Update the invoice with new data and client ID
    const updatedInvoice = await Invoice.findByIdAndUpdate(invoiceId, invoiceData, { new: true, runValidators: true }).populate('client');

    if (!updatedInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Step 2: Find previous client and remove invoice from their invoices array
    if (prevClientId && prevClientId !== newClientId) {
      await Client.findByIdAndUpdate(prevClientId, {
        $pull: { invoices: invoiceId },
      });
    }

    // Step 3: Add invoice to new client's invoices array
    if (newClientId) {
      await Client.findByIdAndUpdate(newClientId, {
        $addToSet: { invoices: invoiceId },
      });
    }

    res.status(200).json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an invoice by ID
export const deleteInvoice = async (req, res) => {
  try {
    // Find and delete the invoice
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Remove the invoice from the client's invoices array
    const client = await Client.findById(invoice.client);
    if (client) {
      client.invoices.pull(invoice._id); // Remove the invoice ID from the array
      await client.save(); // Save the updated client document
    }

    // Retrieve all invoices and populate the client field
    const invoices = await Invoice.find().populate('client');
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createInvoicePdf = async (req, res) => {
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
    const templateFileName = 'InvoiceTemplate.pdf';

    // Access the template file in Cloud Storage
    const templateFile = storage.bucket(templateBucketName).file(templateFileName);

    // Download the template file
    const [templateContents] = await templateFile.download();

    // Load the PDFDocument
    const pdfDoc = await PDFDocument.load(templateContents);

    // Fetch the invoice and populate the client information
    const invoice = req.body.invoice;

    // Get the form from the PDF template and fill it with invoice data
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Load fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // **Client Information**
    const clientNameField = form.getTextField('Invoice Name');
    clientNameField.setText(invoice.client.name || 'N/A');
    clientNameField.updateAppearances(fontBold);

    form.getTextField('Invoice Address').setText(invoice.client.address || 'N/A');
    form.getTextField('Invoice Phone').setText(formatPhoneNumber(invoice.client.phone) || 'N/A');
    form.getTextField('Invoice Email').setText(invoice.client.email || 'N/A');

    // **Invoice Information**
    const invoiceNumberField = form.getTextField('InvoiceNumber');
    invoiceNumberField.setText(invoice.invoiceNumber || 'N/A');
    invoiceNumberField.updateAppearances(fontBold);
    invoiceNumberField.setAlignment(1);

    const dateField = form.getTextField('Date');
    dateField.setText(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A');
    dateField.updateAppearances(fontBold);
    dateField.setAlignment(1);

    // **Invoice Items**
    let descriptionX = 60; // X position for descriptions column
    let priceX = 460; // X position for prices column
    let startingY = 490; // Y position for the first item (adjust as necessary)
    let lineHeight = 20; // Line height between each row

    // Draw the descriptions and prices on the PDF
    invoice.items.forEach((item, index) => {
      // Draw item description in the first column
      firstPage.drawText(item.description || 'N/A', {
        x: descriptionX,
        y: startingY - index * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Draw item price in the second column
      firstPage.drawText(item.price ? item.price.toFixed(2) : '0.00', {
        x: priceX,
        y: startingY - index * lineHeight,
        size: 16,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
    });

    firstPage.drawText('SAME', {
      x: 400,
      y: 560,
      size: 20,
      font: fontRegular,
      color: rgb(1, 0, 0),
    });

    // **Totals**
    const subtotalOne = form.getTextField('Subtotal 1');
    subtotalOne.setText(invoice.subTotal1 ? invoice.subTotal1.toFixed(2) : '0.00');
    subtotalOne.setFontSize(12);
    subtotalOne.setAlignment(1);

    const subtotalTwo = form.getTextField('Subtotal 2');
    subtotalTwo.setText(invoice.subTotal2 ? invoice.subTotal2.toFixed(2) : '0.00');
    subtotalTwo.setFontSize(12);

    const extraWork = form.getTextField(' Extra work  Materials');
    extraWork.setText(invoice.extraWorkMaterials ? invoice.extraWorkMaterials.toFixed(2) : '0.00');
    extraWork.setFontSize(12);

    if (invoice.paymentMethod === 'check') {
      form.getTextField('Check Number').setText(invoice.checkNumber || 'N/A');
    }

    if (invoice.paymentMethod === 'credit/debit') {
      const ccFee = form.getTextField('Credit Card Fee');
      ccFee.setText(invoice.creditCardFee ? invoice.creditCardFee.toFixed(2) : '0.00');
      ccFee.setFontSize(12);
    }

    if (invoice.depositAdjustment) {
      const depositAdjustmentField = form.getTextField('Deposit Adjustment');
      depositAdjustmentField.setText(invoice.depositAdjustment ? invoice.depositAdjustment.toFixed(2) : '0.00');
      depositAdjustmentField.setFontSize(12);
    }

    switch (invoice.paymentMethod) {
      case 'cash':
        form.getCheckBox('Cash Checkbox').check();
        break;
      case 'check':
        form.getCheckBox('Check Checkbox').check();
        break;
      case 'credit/debit':
        form.getCheckBox('CC/DB').check();
        break;
      case 'online':
        form.getCheckBox('Online').check();
        break;
      default:
        console.log('Payment method not recognized');
    }

    const totalField = form.getTextField('Total');
    totalField.setText(invoice.total ? invoice.total.toFixed(2) : '0.00');
    totalField.updateAppearances(fontBold);

    // Flatten the form so the fields are no longer editable
    form.flatten();

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Upload the generated PDF to Google Cloud Storage
    const bucketName = 'invoicesproposals';
    const objectName = `invoices/invoice_${invoice.invoiceNumber}.pdf`;

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
    console.error('Error creating invoice PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

export const downloadInvoicePdf = async (req, res) => {
  try {
    const url = Object.entries(req.query)
      .map(([key, value]) => `${key}${value}`)
      .join('');

    if (!url) {
      return res.status(400).send('Missing PDF URL');
    }

    const tempDir = path.resolve('temp');
    const fileName = `invoice_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    // Ensure the temporary directory exists
    await fs.ensureDir(tempDir);

    // Download the PDF
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const fileStream = fs.createWriteStream(filePath);
    response.body.pipe(fileStream);

    fileStream.on('finish', () => {
      // Send the downloaded PDF to the client
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending the file:', err);
          res.status(500).send('Error sending the PDF');
        }

        // Cleanup: Remove the file after sending
        fs.remove(filePath);
      });
    });

    fileStream.on('error', (err) => {
      console.error('Error writing file:', err);
      res.status(500).send('Error downloading the PDF');
    });
  } catch (err) {
    console.error('Error downloading invoice PDF:', err);
    res.status(500).send('Internal Server Error');
  }
};

export const uploadPdfWithSignature = async (req, res) => {
  try {
    const { pdfUrl, signatureImage, invoiceNumber, invoiceId } = req.body;

    console.log('pdfUrl:', pdfUrl);
    console.log('invoiceNumber:', invoiceNumber);
    console.log('invoiceId:', invoiceId);

    // Fetch the invoice and populate the client field
    const invoice = await Invoice.findById(invoiceId).populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!pdfUrl || !signatureImage) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Remove data URL prefix if present
    const signatureData = signatureImage.replace(/^data:image\/\w+;base64,/, '');

    // Decode the Base64 string to a buffer
    const signatureBuffer = Buffer.from(signatureData, 'base64');

    // Fetch the existing PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const pdfBytes = await response.arrayBuffer();

    // Load and modify the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('PDF loaded successfully');

    // Embed the signature image
    const signatureImageEmbed = await pdfDoc.embedPng(signatureBuffer);
    console.log('Signature image embedded');

    // Determine dimensions for the signature
    const signatureDims = signatureImageEmbed.scale(0.5);

    // Get the first page of the PDF
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Draw the signature image on the PDF
    firstPage.drawImage(signatureImageEmbed, {
      x: 350, // Adjust X position as needed
      y: 190, // Adjust Y position as needed
      width: signatureDims.width / 5,
      height: signatureDims.height / 5,
    });
    console.log('Signature drawn on PDF');

    // Save the modified PDF
    const updatedPdfBytes = await pdfDoc.save();
    console.log('PDF saved with signature');

    const gcsCredentialsBase64 = process.env.GCS_CREDENTIALS_BASE64;
    const gcsCredentials = JSON.parse(Buffer.from(gcsCredentialsBase64, 'base64').toString('utf8'));

    // Initialize Google Cloud Storage client
    const storage = new Storage({
      credentials: gcsCredentials,
    });
    const bucketName = 'invoicesproposals';
    const objectName = `invoices/invoice_${invoiceNumber}_signed.pdf`;

    console.log('Uploading file with object name:', objectName);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(Buffer.from(updatedPdfBytes), {
      metadata: { contentType: 'application/pdf' },
      predefinedAcl: 'publicRead',
    });

    console.log('File uploaded successfully to:', objectName);

    // Update the invoice with the signed PDF URL and status
    invoice.signedPdfUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${new Date().getTime()}`;
    invoice.status = 'signed and paid';
    await invoice.save();

    // Update the client's status
    const client = invoice.client;
    if (client) {
      client.statusHistory.push({
        status: 'invoice paid and signed',
        date: new Date(),
      });
      await client.save();
    }

    // Revoke the token associated with the invoice
    if (invoice.token) {
      const tokenDoc = await Token.findById(invoice.token);
      if (tokenDoc) {
        tokenDoc.revoked = true;
        await tokenDoc.save();
      }
    }

    const notification = new Notification({
      title: 'Invoice Signed and Paid',
      message: `Invoice ${invoice.invoiceNumber} has been signed and paid`,
      type: 'invoices',
      id: invoice._id,
    });

    await notification.save();

    // Construct the public URL with cache-busting query string
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${objectName}?t=${new Date().getTime()}`;
    console.log('File URL:', fileUrl);
    res.json({ url: fileUrl, signedInvoice: invoice });
  } catch (error) {
    console.error('Error embedding signature into PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createToken = async (req, res) => {
  try {
    const { invoiceId, data } = req.body;
    const { invoiceUrl } = data;

    // Find the invoice by ID
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Prepare token data
    const tokenData = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl,
      signed: false,
    };

    // Generate JWT token
    const tokenString = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '2d' });

    // Create a new Token document
    const tokenDoc = new Token({
      token: tokenString,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Expires in 2 days
      revoked: false,
    });

    // Save the Token document to the database
    await tokenDoc.save();

    // Update the invoice to reference the new Token document
    invoice.token = tokenDoc._id; // Ensure your Invoice model has a 'token' field
    await invoice.save();

    // Respond with the generated token
    res.status(200).json({ token: tokenString });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    // Find the token in the database
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Check if the token is revoked
    if (tokenDoc.revoked) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    // Check if the token has expired
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Token has expired' });
    }

    // Verify the JWT token
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Token is valid
      res.status(200).json(decoded);
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const revokeToken = async (req, res) => {
  try {
    const { token } = req.body;

    // Find the token in the database
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.status(404).json({ message: 'Token not found' });
    }

    // Revoke the token
    tokenDoc.revoked = true;
    await tokenDoc.save();

    res.status(200).json({ message: 'Token revoked successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
