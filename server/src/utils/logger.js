// Simple console logger utility

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set the minimum log level (e.g., 'info', 'debug')
// You could make this configurable via environment variables
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || "info";
const minLevel = LOG_LEVELS[CURRENT_LOG_LEVEL.toLowerCase()] ?? LOG_LEVELS.info;

const log = {
  debug: (...args) => {
    if (minLevel <= LOG_LEVELS.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()}:`, ...args);
    }
  },
  info: (...args) => {
    if (minLevel <= LOG_LEVELS.info) {
      console.info(`[INFO] ${new Date().toISOString()}:`, ...args);
    }
  },
  warn: (...args) => {
    if (minLevel <= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
    }
  },
  error: (...args) => {
    if (minLevel <= LOG_LEVELS.error) {
      console.error(`[ERROR] ${new Date().toISOString()}:`, ...args);
    }
  },
};

module.exports = { log };
