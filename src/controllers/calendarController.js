import axios from 'axios';

const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

export const listCalendarEvents = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken || !authToken.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  let allEvents = [];
  let nextPageToken = null;

  try {
    do {
      const response = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        headers: {
          Authorization: authToken,
        },
        params: {
          singleEvents: true, // Ensure proper sorting of recurring events
          orderBy: 'startTime',
          timeMin: new Date('2000-01-01').toISOString(), // Fetch all past events
          timeMax: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(), // Up to three months from today
          maxResults: 250, // Fetch the maximum number of events per request
          pageToken: nextPageToken, // Use the nextPageToken for pagination
        },
      });

      // Append events to the allEvents array
      const { items, nextPageToken: token } = response.data;
      allEvents = allEvents.concat(items);
      nextPageToken = token; // Update the nextPageToken to fetch the next page of results
    } while (nextPageToken); // Continue fetching until there's no nextPageToken

    res.json(allEvents); // Return all the events
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};

export const getCalendarEvent = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ msg: 'Event ID is required' });
  }

  const url = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events/${eventId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: authToken,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};

export const createCalendarEvent = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const event = req.body;

  if (!event) {
    return res.status(400).json({ msg: 'Event data is required' });
  }

  const url = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`;

  try {
    await axios.post(url, event, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });

    const response = await axios.get(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`, {
      headers: {
        Authorization: authToken,
      },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      },
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};

export const updateCalendarEvent = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const eventId = req.params.eventId;
  const eventUpdates = req.body;

  if (!eventId) {
    return res.status(400).json({ msg: 'Event ID is required' });
  }

  if (!eventUpdates) {
    return res.status(400).json({ msg: 'Event data is required' });
  }

  const url = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events/${eventId}`;

  try {
    await axios.put(url, eventUpdates, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });

    const response = await axios.get(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`, {
      headers: {
        Authorization: authToken,
      },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      },
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};

export const deleteCalendarEvent = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ msg: 'Event ID is required' });
  }

  const url = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events/${eventId}`;

  try {
    await axios.delete(url, {
      headers: {
        Authorization: authToken,
      },
    });

    const response = await axios.get(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`, {
      headers: {
        Authorization: authToken,
      },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      },
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};

export const listCalendars = async (req, res) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const url = `${GOOGLE_CALENDAR_API_BASE_URL}/users/me/calendarList`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: authToken,
      },
    });

    const calendars = response.data.items || [];
    res.json(calendars);
  } catch (error) {
    res.status(error.response.data.error.code).send(error.response.data.error.message);
  }
};
