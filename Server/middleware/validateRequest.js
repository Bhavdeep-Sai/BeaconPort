/**
 * Zod request validation middleware.
 * Validates req.body, req.query, or req.params against provided Zod schemas.
 * 
 * Usage:
 *   router.post('/path', validateRequest({ body: createSchema }), controller.create);
 */
const validateRequest = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateRequest;
