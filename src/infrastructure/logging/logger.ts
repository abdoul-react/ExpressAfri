const MONITORING_URL =
  process.env.EXPO_PUBLIC_MONITORING_URL || process.env.MONITORING_URL || "";

export type LoggerMetadata = Record<string, unknown>;

async function sendToMonitoring(
  level: string,
  message: string,
  metadata?: LoggerMetadata,
) {
  if (!MONITORING_URL) return;

  try {
    await fetch(MONITORING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message,
        metadata: metadata ?? {},
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // intentionally silent: monitoring should not break the app flow
  }
}

export const logger = {
  info(message: string, metadata?: LoggerMetadata) {
    console.info(`[info] ${message}`, metadata ?? "");
    void sendToMonitoring("info", message, metadata);
  },

  warn(message: string, metadata?: LoggerMetadata) {
    console.warn(`[warn] ${message}`, metadata ?? "");
    void sendToMonitoring("warn", message, metadata);
  },

  error(message: string, metadata?: LoggerMetadata) {
    console.error(`[error] ${message}`, metadata ?? "");
    void sendToMonitoring("error", message, metadata);
  },
};

export default logger;
