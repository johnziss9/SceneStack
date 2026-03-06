import pino from 'pino';

// Create browser-compatible Pino logger
const logger = pino({
  browser: {
    asObject: true,
    // Optional: Configure transmit to send logs to backend
    // transmit: {
    //   level: 'error',
    //   send: (level, logEvent) => {
    //     // Send critical errors to backend for persistence
    //     if (level === 'error' || level === 'fatal') {
    //       fetch('/api/logs', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(logEvent)
    //       }).catch(() => {});
    //     }
    //   }
    // }
  },
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    env: process.env.NODE_ENV,
  },
});

// Helper to add correlation ID to logs
let currentCorrelationId: string | null = null;

export const setCorrelationId = (correlationId: string | null) => {
  currentCorrelationId = correlationId;
};

export const getCorrelationId = () => currentCorrelationId;

// Create child logger with correlation ID context
export const getLogger = () => {
  if (currentCorrelationId) {
    return logger.child({ correlationId: currentCorrelationId });
  }
  return logger;
};

// Export default logger
export default logger;

// Convenience methods with correlation ID
export const log = {
  debug: (msg: string, data?: object) => getLogger().debug(data, msg),
  info: (msg: string, data?: object) => getLogger().info(data, msg),
  warn: (msg: string, data?: object) => getLogger().warn(data, msg),
  error: (msg: string, error?: Error | unknown, data?: object) => {
    if (error instanceof Error) {
      getLogger().error({ ...data, error: error.message, stack: error.stack }, msg);
    } else {
      getLogger().error({ ...data, error }, msg);
    }
  },
  fatal: (msg: string, error?: Error | unknown, data?: object) => {
    if (error instanceof Error) {
      getLogger().fatal({ ...data, error: error.message, stack: error.stack }, msg);
    } else {
      getLogger().fatal({ ...data, error }, msg);
    }
  },
};
