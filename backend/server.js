require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const { startEscalationEngine } = require('./escalationEngine');

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'Nagrik Setu API Server',
    status: 'online',
    version: '1.0.0',
    health: '/api/health',
    dbStatus: '/api/db-status'
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'grievance-system-api', dbConnected: true }));

app.get('/api/db-status', async (req, res) => {
  const status = await db.getDbStatus();
  res.json(status);
});
app.get('/db-status', async (req, res) => {
  const status = await db.getDbStatus();
  res.json(status);
});

// Support both /api/* and direct route endpoints for seamless compatibility
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/complaints', complaintRoutes);
app.use('/complaints', complaintRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/analytics', analyticsRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

// Central error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Grievance System API running on http://localhost:${PORT}`);
  startEscalationEngine();
});
