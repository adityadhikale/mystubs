const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const healthRouter = require('./routes/health');
const searchRouter = require('./routes/search');
const titlesRouter = require('./routes/titles');
const trendingRouter = require('./routes/trending');
const statusRouter = require('./routes/status');

const app = express();

// Configure CORS to allow requests from the Vite dev server (typically http://localhost:5173)
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Middleware to parse JSON payloads
app.use(express.json());

// Register API Routes
app.use('/api/health', healthRouter);
app.use('/api/search', searchRouter);
app.use('/api/titles', titlesRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/status', statusRouter);

// Fallback 404 handler for API endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start listening
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  MyStubs Backend Server started successfully!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);
});
