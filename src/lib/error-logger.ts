export interface ErrorLog {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  severity: "info" | "warn" | "error" | "fatal";
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  log(message: string, error?: Error | unknown, context?: Record<string, any>, severity: "info" | "warn" | "error" | "fatal" = "error") {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      severity,
    };

    this.logs.push(errorLog);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const logMethod = severity === "fatal" ? "error" : severity;
      const method = console[logMethod as keyof typeof console] as any;
      method(
        `[${severity.toUpperCase()}] ${message}`,
        error,
        context
      );
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === "production" && severity !== "info") {
      this.reportToService(errorLog);
    }

    return errorLog;
  }

  info(message: string, context?: Record<string, any>) {
    return this.log(message, undefined, context, "info");
  }

  warn(message: string, error?: Error | unknown, context?: Record<string, any>) {
    return this.log(message, error, context, "warn");
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    return this.log(message, error, context, "error");
  }

  fatal(message: string, error?: Error | unknown, context?: Record<string, any>) {
    return this.log(message, error, context, "fatal");
  }

  getLogs(severity?: "info" | "warn" | "error" | "fatal") {
    return severity ? this.logs.filter((log) => log.severity === severity) : this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  private reportToService(errorLog: ErrorLog) {
    // TODO: Implement error reporting service
    // e.g., Sentry, LogRocket, etc.
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorLog),
    }).catch(() => {
      // Silently fail if logging service is unavailable
    });
  }
}

export const errorLogger = new ErrorLogger();
