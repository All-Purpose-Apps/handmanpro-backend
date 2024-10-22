import { google } from 'googleapis';

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
