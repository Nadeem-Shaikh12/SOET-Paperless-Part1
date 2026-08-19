import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import 'dotenv/config';

import logger from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { initSlaEscalationJob } from './cron/sla-escalation.js';

// Route imports
import authRoutes from './modules/auth/routes.js';
import institutionalRoutes from './modules/institutional/routes.js';
import facultyRoutes from './modules/faculty/routes.js';
import subjectsRoutes from './modules/subjects/routes.js';
import classesBatchesRoutes from './modules/classes-batches/routes.js';
import allocationsRoutes from './modules/allocations/routes.js';
import approvalsRoutes from './modules/approvals/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';
import workloadReportRoutes from './modules/workload-report/routes.js';

const app = express();
const PORT = process.env.API_PORT || 4000;

// ─── Middleware ───

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body & Cookie parsing
app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000', 10),
  limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  message: 'Too many auth requests, please try again later.',
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '60000', 10),
  limit: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100', 10),
  message: 'Too many requests, please try again later.',
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', generalLimiter);

// ─── Routes ───

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/institutional', institutionalRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1', classesBatchesRoutes); // Mounted at /api/v1 to support /classes and /student-strength
app.use('/api/v1/allocations', allocationsRoutes);
app.use('/api/v1/approvals', approvalsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/workload-report', workloadReportRoutes);

// ─── Error Handling ───

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Centralized Error Handler
app.use(errorHandler);

// ─── Server Startup ───

app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  
  // Start Cron Jobs
  initSlaEscalationJob();
});
