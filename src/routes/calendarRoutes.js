// routes/calendarRoutes.js

import express from 'express';
import {
  listCalendars,
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../controllers/calendarController.js';

const router = express.Router();

// Add this route
router.get('/calendars', listCalendars);

// Existing routes
router.get('/events', listCalendarEvents);
router.get('/events/:eventId', getCalendarEvent);
router.post('/events', createCalendarEvent);
router.put('/events/:eventId', updateCalendarEvent);
router.delete('/events/:eventId', deleteCalendarEvent);

export default router;
