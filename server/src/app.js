const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();

// Standard Security & Body Parsers
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Welcome Info Route
app.get('/', (req, res) => {
  res.status(200).json({
    app: 'VALETEC PHARMA API',
    description: 'Sistema Integral de Gestión Farmacéutica y Mostrador',
    version: '2.0.0',
    documentation: '/api/health'
  });
});

// Mount All API Routes under /api
app.use('/api', apiRoutes);

// Catch 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
