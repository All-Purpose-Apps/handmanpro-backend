// controllers/calendarController.js
import { google } from 'googleapis';

export const listCalendarEvents = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).send('Server Error');
  }
};

export const getCalendarEvent = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ msg: 'Event ID is required' });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).send('Server Error');
  }
};

export const createCalendarEvent = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const event = req.body;

  if (!event) {
    return res.status(400).json({ msg: 'Event data is required' });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).send('Server Error');
  }
};

export const updateCalendarEvent = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
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

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: eventUpdates,
    });

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).send('Server Error');
  }
};

export const deleteCalendarEvent = async (req, res) => {
  const oauth2Client = req.oauth2Client;

  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendarId = req.query.calendarId || 'primary';
  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ msg: 'Event ID is required' });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    res.json(events);
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).send('Server Error');
  }
};

export const listCalendars = async (req, res) => {
  const oauth2Client = req.oauth2Client;
  if (!oauth2Client) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];
    res.json(calendars);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).send('Server Error');
  }
};
