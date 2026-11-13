require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'FRONTEND_URL',
  ];
  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required production environment variables: ${missingEnvVars.join(', ')}`);
  }
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const packageRoutes = require('./routes/packages');
const journeyRoutes = require('./routes/journeys');
const deliveryRoutes = require('./routes/deliveries');
const otpRoutes = require('./routes/otp');
const paymentRoutes = require('./routes/payments');
const ratingRoutes = require('./routes/ratings');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const senderRoutes = require('./routes/sender');
const travelerRoutes = require('./routes/traveler');

const app = express();
const httpServer = http.createServer(app);

// Socket.io for live location tracking
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// In-memory store: packageId -> { lat, lng, updatedAt }
const locationStore = {};

io.on('connection', (socket) => {
  // Traveler joins a package room to broadcast location
  socket.on('traveler:join', ({ packageId }) => {
    socket.join(`pkg:${packageId}`);
  });

  // Traveler sends location update
  socket.on('traveler:location', ({ packageId, lat, lng }) => {
    locationStore[packageId] = { lat, lng, updatedAt: new Date().toISOString() };
    // Broadcast to all senders watching this package
    io.to(`pkg:${packageId}`).emit('location:update', { lat, lng, updatedAt: locationStore[packageId].updatedAt });
  });

  // Sender joins a package room to watch location
  socket.on('sender:watch', ({ packageId }) => {
    socket.join(`pkg:${packageId}`);
    // Send last known location immediately if available
    if (locationStore[packageId]) {
      socket.emit('location:update', locationStore[packageId]);
    }
  });

  socket.on('disconnect', () => {});
});

// Expose io and locationStore so routes can use them
app.set('io', io);
app.set('locationStore', locationStore);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/delivery-requests', deliveryRoutes);
app.use('/api/sender', senderRoutes);
app.use('/api/traveler', travelerRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// REST endpoint: GET last known location for a package (sender polling fallback)
app.get('/api/location/:packageId', (req, res) => {
  const loc = locationStore[req.params.packageId];
  if (loc) {
    res.json({ success: true, data: loc });
  } else {
    res.json({ success: false, data: null });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('MySQL connected successfully');
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    await pool.end();
    process.exitCode = 1;
    return;
  } finally {
    if (connection) connection.release();
  }

  httpServer.listen(PORT, () => {
    console.log(`RelayGo backend running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Backend startup failed:', err);
  process.exitCode = 1;
});

module.exports = app;
