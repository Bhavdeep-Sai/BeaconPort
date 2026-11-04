/**
 * Wraps an async route handler or middleware to catch any rejected promises
 * and pass them to Express's next() error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
