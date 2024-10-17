import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import clientRoutes from './routes/clientRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import lastSyncedRoutes from './routes/lastSyncedRoutes.js';

connectDB();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/last-synced', lastSyncedRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
