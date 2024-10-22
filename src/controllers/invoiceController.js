import Invoice from '../models/Invoice.js';
import { google } from 'googleapis';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PassThrough } from 'stream';
import { Storage } from '@google-cloud/storage';
import { formatPhoneNumber } from '../utils/formatPhoneNumber.js';

// Create a new invoice
export const createInvoice = async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
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
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an invoice by ID
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json({ message: 'Invoice deleted' });
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
    clientNameField.setText(`${invoice.client.firstName} ${invoice.client.lastName}` || 'N/A');
    clientNameField.updateAppearances(fontBold);

    form.getTextField('Invoice Address').setText(invoice.client.address || 'N/A');
    form.getTextField('Invoice Phone').setText(formatPhoneNumber(invoice.client.phone) || 'N/A');
    form.getTextField('Invoice Email').setText(invoice.client.email || 'N/A');

    // **Invoice Information**
    const invoiceNumberField = form.getTextField('InvoiceNumber');
    invoiceNumberField.setText(invoice.invoiceNumber || 'N/A');
    invoiceNumberField.updateAppearances(fontBold);

    form.getTextField('Date').setText(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A');

    // **Invoice Items**
    let descriptionX = 60; // X position for descriptions column
    let discountX = 460; // X position for discounts column
    let startingY = 490; // Y position for the first item (adjust as necessary)
    let lineHeight = 20; // Line height between each row

    // Draw the descriptions and discounts on the PDF
    invoice.items.forEach((item, index) => {
      // Draw item description in the first column
      firstPage.drawText(item.description || 'N/A', {
        x: descriptionX,
        y: startingY - index * lineHeight,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Draw item discount in the second column
      firstPage.drawText(item.discount ? item.discount.toFixed(2) : '0.00', {
        x: discountX,
        y: startingY - index * lineHeight,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
    });

    // **Totals**
    form.getTextField('Subtotal 1').setText(invoice.subTotal1 ? invoice.subTotal1.toFixed(2) : '0.00');
    form.getTextField('Subtotal 2').setText(invoice.subTotal2 ? invoice.subTotal2.toFixed(2) : '0.00');
    form.getTextField('Total').setText(invoice.total ? invoice.total.toFixed(2) : '0.00');

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
