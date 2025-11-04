const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import sync endpoint
const bookingSync = require('./api/sync/booking');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Channel Manager Booking Sync',
    timestamp: new Date().toISOString()
  });
});

// Booking.com sync endpoint
app.post('/api/sync/booking', bookingSync);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Channel Manager Booking Sync',
    endpoints: {
      health: 'GET /health',
      bookingSync: 'POST /api/sync/booking'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Booking sync: POST http://localhost:${PORT}/api/sync/booking`);
});
