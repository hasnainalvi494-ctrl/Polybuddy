import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// Fastify logger config
export const loggerConfig = {
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      }
    : undefined,
};

// Standalone logger for services/jobs
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  }),
});
