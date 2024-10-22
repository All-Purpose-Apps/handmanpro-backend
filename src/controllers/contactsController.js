import { google } from 'googleapis';

export const listContacts = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  try {
    const response = await peopleService.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers,addresses',
      pageSize: 1000,
    });

    const connections = response.data.connections || [];

    // Process and format contacts as needed
    const formattedContacts = connections.map((contact) => {
      const resourceName = contact.resourceName;
      const name = contact.names ? contact.names[0].displayName : '';
      const email = contact.emailAddresses ? contact.emailAddresses[0].value : '';
      // ... add other fields as needed
      return { resourceName, name, email };
    });

    res.json(formattedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).send('Server Error');
  }
};
