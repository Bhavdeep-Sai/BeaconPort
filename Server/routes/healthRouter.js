const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

/**
 * GET /health
 * Liveness probe: verifies that the Express process is running and receiving traffic.
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 * Readiness probe: verifies that database connectivity is established and ready.
 */
router.get("/ready", (req, res) => {
  // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isConnected = mongoose.connection.readyState === 1;

  if (isConnected) {
    return res.status(200).json({
      status: "ready",
      database: "connected",
    });
  }

  return res.status(503).json({
    status: "unready",
    database: "disconnected",
  });
});

module.exports = router;
