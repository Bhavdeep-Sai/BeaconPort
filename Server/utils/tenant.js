const { UnauthorizedError } = require("./errors");

/**
 * Returns a query filter scoped to the authenticated tenant (school).
 * Throws an UnauthorizedError if no authenticated tenant context is present.
 *
 * @param {Object} req Express request object containing req.user
 * @param {Object} query Additional query filters to combine with school scoping
 * @returns {Object} { ...query, school: req.user.schoolId }
 */
function getTenantFilter(req, query = {}) {
  const schoolId = req?.user?.schoolId;
  if (!schoolId) {
    throw new UnauthorizedError(
      "Tenant context required: request is not authenticated with a school"
    );
  }
  return {
    ...query,
    school: schoolId,
  };
}

/**
 * Middleware that attaches a tenant filter helper to req.tenantFilter
 */
function attachTenantContext(req, res, next) {
  if (req.user && req.user.schoolId) {
    req.tenantFilter = (query = {}) => getTenantFilter(req, query);
  }
  next();
}

module.exports = {
  getTenantFilter,
  attachTenantContext,
};
