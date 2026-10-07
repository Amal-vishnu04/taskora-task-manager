const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const internalRoutes = require('./routes/internalRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/internal', internalRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TaskFlow API is running',
  });
});

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW();');
    res.json({
      success: true,
      message: 'PostgreSQL connection successful',
      databaseTime: result.rows[0].now,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'PostgreSQL connection failed',
    });
  }
});

module.exports = app;