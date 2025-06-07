import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

import express from 'express';
import cors from 'cors';
// import connectDB from './config/db.js';
import clientRoutes from './routes/clientRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import lastSyncedRoutes from './routes/lastSyncedRoutes.js';
import gmailRoutes from './routes/gmailRoutes.js';
import contactsRoutes from './routes/contactsRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import filesRoutes from './routes/filesRoutes.js';
import expressListRoutes from 'express-list-routes';
import { authenticateGoogleAPI } from './middleware/googleAuthMiddleware.js';
import materialsListRoutes from './routes/materialsListRoutes.js';

// connectDB();

const app = express();

mongoose.connect(process.env.MONGO_URI);

app.use(express.json({ limit: '50mb' }));
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = ['http://localhost:5173', 'http://192.168.1.213:5173', 'https://handmanpro.netlify.app'];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/invoices/download-pdf/')) {
    return next(); // Skip middleware for this route
  }

  if (req.path.startsWith('/api/invoices/upload-pdf-with-signature')) {
    return next(); // Skip middleware for this route
  }

  if (req.path.startsWith('/api/invoices/verify-token')) {
    return next(); // Skip middleware for this route
  }

  if (req.path.startsWith('/api/proposals/verify-token')) {
    return next(); // Skip middleware for this route
  }

  if (req.path.startsWith('/api/proposals/download-pdf/')) {
    return next(); // Skip middleware for this route
  }

  if (req.path.startsWith('/api/proposals/upload-pdf-with-signature')) {
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/materials', materialsListRoutes);
app.use('/api/files', filesRoutes);

// expressListRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
