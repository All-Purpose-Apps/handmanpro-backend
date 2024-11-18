import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import clientRoutes from './routes/clientRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import lastSyncedRoutes from './routes/lastSyncedRoutes.js';
import gmailRoutes from './routes/gmailRoutes.js';
import contactsRoutes from './routes/contactsRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import expressListRoutes from 'express-list-routes';
import { authenticateGoogleAPI } from './middleware/googleAuthMiddleware.js';

connectDB();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:5173' || 'https://handmanpro.netlify.app', // Replace with your frontend's origin
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/invoices/download-pdf/')) {
    return next(); // Skip middleware for this route
  }
  authenticateGoogleAPI(req, res, next); // Or other middleware
});

app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/last-synced', lastSyncedRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/google/contacts', contactsRoutes);
app.use('/api/google/calendar', calendarRoutes);

// expressListRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
