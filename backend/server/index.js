import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connect } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import caseRoutes from './src/routes/cases.js';
import clientRoutes from './src/routes/clients.js';
import alertRoutes from './src/routes/alerts.js';
import timeEntryRoutes from './src/routes/timeEntries.js';
import legalSectionRoutes from './src/routes/legalSections.js';
import documentsRoutes from './src/routes/documents.js';
import invoiceRoutes from './src/routes/invoices.js';
import hearingRoutes from './src/routes/hearings.js';
import dashboardRoutes from './src/routes/dashboard.js';
import path from 'path';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:8080', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'lawyer-zen-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/legal-sections', legalSectionRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/hearings', hearingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve uploads
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

connect().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database', err);
  process.exit(1);
});



