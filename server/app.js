/**
 * Express application wiring.
 *
 * `express-async-errors` is required FIRST: it patches Express so a rejected
 * promise inside an async controller is forwarded to the error middleware
 * instead of crashing the process.
 */
require('express-async-errors');
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { UPLOAD_ROOT } = require('./middleware/upload');

const app = express();

/* ------------------------------- security -------------------------------- */

// Don't advertise the framework.
app.disable('x-powered-by');

// Minimal hardening. (Add helmet if you deploy behind an untrusted network.)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// CORS: allow the configured client origins (comma separated). Requests with no
// Origin header (curl, Postman, server-to-server, same-origin <img>) pass too.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

/* -------------------------------- parsers -------------------------------- */

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ------------------------------ static files ----------------------------- */

// Uploaded photos / verification documents. maxAge lets the browser cache them;
// filenames are randomised so caching is safe.
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d', fallthrough: true }));

/* --------------------------------- routes -------------------------------- */

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Community Food Wastage Reduction Portal API',
      version: '1.0.0',
      docs: '/api/health',
    },
  });
});

app.use('/api', apiRoutes);

/* ---------------------------- error handling ----------------------------- */

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
