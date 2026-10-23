'use strict';
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds allowed limit.' : `Upload error: ${err.message}`;
  }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid authentication token.'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Authentication token has expired.'; }
  if (err.status) { statusCode = err.status; }

  const response = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && err.stack) response.stack = err.stack;
  console.error(`[Error] ${statusCode} - ${message}`);
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
