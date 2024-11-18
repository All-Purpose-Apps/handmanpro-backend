import { google } from 'googleapis';
import axios from 'axios';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';

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

    res.status(200).json({ msg: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ msg: 'Failed to send email', error: error.message });
  } finally {
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
