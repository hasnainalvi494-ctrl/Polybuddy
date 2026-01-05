const isDev = process.env.NODE_ENV !== "production";

export const logger = {
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
