import { google } from 'googleapis';
import axios from 'axios';
import { getTenantDb } from '../config/db.js';
import clientSchema from '../models/Client.js';
import invoiceSchema from '../models/Invoice.js';
import notificationSchema from '../models/Notification.js';
import proposalSchema from '../models/Proposal.js';
import { emitNotification } from '../index.js';

export const listGmailMessages = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10, // Fetch 10 latest emails
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    res.status(500).send('Server Error');
  }
};

export const sendEmail = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  const { to, subject, body, pdfUrl, invoice } = req.body;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const db = await getTenantDb(req.tenantId);
  const Client = db.models.Client || db.model('Client', clientSchema);
  const Invoice = db.models.Invoice || db.model('Invoice', invoiceSchema);
  const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch PDF from URL and encode it in base64
    const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfBase64 = Buffer.from(pdfResponse.data).toString('base64');

    // Construct email with PDF attachment
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      '',
      '--boundary',
      'Content-Type: application/pdf',
      'Content-Disposition: attachment; filename="invoice.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      '--boundary--',
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send the email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    const notification = new Notification({
      title: 'Invoice Sent',
      message: `Invoice ${invoice.invoiceNumber} sent to ${to}`,
      type: 'email',
      id: invoice._id,
    });
    await notification.save();
    emitNotification(req.tenantId, notification);
    res.status(200).json({ msg: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ msg: 'Failed to send email', error: error.message });
  } finally {
    const db = await getTenantDb(req.tenantId);
    const Client = db.models.Client || db.model('Client', clientSchema);
    try {
      const updateTimestamp = { updatedAt: new Date() };

      // Update client's statusHistory and updatedAt
      await Client.findByIdAndUpdate(invoice.client._id, {
        $push: { statusHistory: { status: 'invoice sent', date: updateTimestamp.updatedAt } },
        ...updateTimestamp,
      });

      // Update invoice status to "sent" and updatedAt
      await Invoice.findByIdAndUpdate(invoice._id, {
        status: 'sent',
        ...updateTimestamp,
      });

      console.log('Client statusHistory, invoice status, and updatedAt fields updated successfully.');
    } catch (updateError) {
      console.error('Error updating client or invoice status and updatedAt:', updateError);
    }
  }
};

export const sendProposal = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  const { to, subject, body, pdfUrl, proposal } = req.body;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const db = await getTenantDb(req.tenantId);
    const Client = db.models.Client || db.model('Client', clientSchema);
    const Invoice = db.models.Invoice || db.model('Invoice', invoiceSchema);
    const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch PDF from URL and encode it in base64
    const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfBase64 = Buffer.from(pdfResponse.data).toString('base64');

    // Construct email with PDF attachment
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      '',
      '--boundary',
      'Content-Type: application/pdf',
      'Content-Disposition: attachment; filename="proposal.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      '--boundary--',
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send the email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    const notification = new Notification({
      title: 'Proposal Sent',
      message: `Proposal ${proposal.proposalNumber} sent to ${to}`,
      type: 'email',
      id: proposal._id,
    });
    await notification.save();
    emitNotification(req.tenantId, notification);
    res.status(200).json({ msg: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ msg: 'Failed to send email', error: error.message });
  } finally {
    try {
      const db = await getTenantDb(req.tenantId);
      const Client = db.models.Client || db.model('Client', clientSchema);
      const Proposal = db.models.Proposal || db.model('Proposal', proposalSchema);
      const updateTimestamp = { updatedAt: new Date() };

      // Update client's statusHistory and updatedAt
      await Client.findByIdAndUpdate(proposal.client._id, {
        $push: { statusHistory: { status: 'proposal sent', date: updateTimestamp.updatedAt } },
        ...updateTimestamp,
      });

      // Update proposal status to "sent to client" and updatedAt
      await Proposal.findByIdAndUpdate(proposal._id, {
        status: 'sent to client',
        ...updateTimestamp,
      });

      console.log('Client statusHistory, proposal status, and updatedAt fields updated successfully.');
    } catch (updateError) {
      console.error('Error updating client or proposal status and updatedAt:', updateError);
    }
  }
};

export const sendReviewRequestEmail = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  const { to, subject, clientId } = req.body;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const db = await getTenantDb(req.tenantId);
    const Notification = db.models.Notification || db.model('Notification', notificationSchema);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct email body with review link
    const body = `
    <p>Thank you for choosing our service!</p>
    <p>We would appreciate it if you could take a moment to review us on social media:</p>

    <p>Your feedback helps us improve and grow.</p>
    <p>Thank you!</p>`;

    // Construct email without attachment
    const email = [`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset="UTF-8"', '', body].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send the email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    const notification = new Notification({
      title: 'Review Request Sent',
      message: `Review request sent to ${to}`,
      type: 'email',
    });
    await notification.save();
    emitNotification(req.tenantId, notification);
    res.status(200).json({ msg: 'Review request email sent successfully!' });
  } catch (error) {
    console.error('Error sending review request email:', error);
    res.status(500).json({ msg: 'Failed to send review request email', error: error.message });
  } finally {
    try {
      const db = await getTenantDb(req.tenantId);
      const Client = db.models.Client || db.model('Client', clientSchema);
      const updateTimestamp = { updatedAt: new Date() };

      // Update client's statusHistory and updatedAt
      await Client.findByIdAndUpdate(clientId, {
        $push: { statusHistory: { status: 'review requested', date: updateTimestamp.updatedAt } },
        ...updateTimestamp,
      });

      console.log('Client statusHistory, and updatedAt fields updated successfully.');
    } catch (updateError) {
      console.error('Error updating client or invoice status and updatedAt:', updateError);
    }
  }
};
