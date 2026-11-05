const pino = require("pino");

const isTest = process.env.NODE_ENV === "test";

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : "info"),
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "*.password",
      "token",
      "*.token",
      "oldPassword",
      "newPassword",
      "secret",
      "apiKey"
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

module.exports = logger;
