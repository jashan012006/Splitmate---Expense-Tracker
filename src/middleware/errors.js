const { validationResult } = require('express-validator');
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(422).json({ success: false, message: 'Please correct the highlighted fields.', errors: result.array().map(e => ({ field: e.path, message: e.msg })) });
  next();
}
function notFound(req, res) { res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` }); }
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.code === 11000) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid resource identifier.' });
  if (err.name === 'ValidationError') return res.status(422).json({ success: false, message: err.message });
  const status = err.status || 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  res.status(status).json({ success: false, message: status >= 500 ? 'Internal server error.' : err.message });
}
module.exports = { validate, notFound, errorHandler };
