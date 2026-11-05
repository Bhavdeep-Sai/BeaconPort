const crypto = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("../utils/logger");

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    return req.headers["x-request-id"] || crypto.randomUUID();
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with status ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        host: req.headers.host,
        "user-agent": req.headers["user-agent"],
        "x-request-id": req.id,
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

function loggingMiddleware(req, res, next) {
  httpLogger(req, res);
  // Echo x-request-id back to client response header
  if (req.id) {
    res.setHeader("x-request-id", req.id);
  }
  next();
}

module.exports = loggingMiddleware;
