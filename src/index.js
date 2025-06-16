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
import Notification from './models/Notification.js';

export const emitNotification = async (tenantId, notification) => {
  console.log('Emitting Notification to tenant:', tenantId);
  const sockets = await io.in(tenantId).fetchSockets();
  console.log(
    `Sockets in room [${tenantId}]:`,
    sockets.map((s) => s.id)
  );
  io.to(tenantId).emit('newNotification', notification);
};

// socket.io
import { Server } from 'socket.io';

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
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = ['http://localhost:5173', 'http://192.168.1.213:5173', 'https://handmanpro.netlify.app'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

io.use((socket, next) => {
  // Extract tenantId from headers
  const tenantId = socket.handshake.headers['tenant-id'];
  console.log('Socket connection attempt with tenantId:', tenantId);
  if (!tenantId) return next(new Error('tenantId is required'));
  socket.tenantId = tenantId;
  socket.join(tenantId);
  next();
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
