import { google } from 'googleapis';

export const listContacts = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  const emailToFilterOut = req.query.email;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  try {
    const response = await peopleService.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers,addresses,metadata',
      pageSize: 1000,
    });

    const connections = response.data.connections || [];

    // Filter out the specified email before mapping
    const formattedContacts = connections
      .filter((contact) => !(contact.emailAddresses && contact.emailAddresses[0].value === emailToFilterOut))
      .map((contact) => {
        const resourceName = contact.resourceName;
        const name = contact.names ? contact.names[0].displayName : '';
        const email = contact.emailAddresses ? contact.emailAddresses[0].value : '';
        const phone = contact.phoneNumbers ? contact.phoneNumbers[0].value : '';
        const address = contact.addresses ? contact.addresses[0].formattedValue : '';
        return { resourceName, name, email, phone, address };
      });

    res.json(formattedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).send('Server Error');
  }
};

export const createGoogleContact = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  // Extract contact details from request body
  const { givenName, familyName, email, phone, address } = req.body;

  console.log('req.body:', req.body);
  try {
    const response = await peopleService.people.createContact({
      requestBody: {
        names: [{ givenName, familyName }],
        emailAddresses: email ? [{ value: email }] : undefined,
        phoneNumbers: phone ? [{ value: phone }] : undefined,
        addresses: address ? [{ formattedValue: address }] : undefined,
      },
    });

    // Respond with the created contact details
    res.json({
      msg: 'Contact created successfully',
      contact: response.data,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).send('Server Error');
  }
};
