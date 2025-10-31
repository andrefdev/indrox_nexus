type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, any>
  time: number
}

export class Logger {
  constructor(private prefix: string = "app") {}

  private emit(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = { level, message, context, time: Date.now() }
    const payload = { ...entry, prefix: this.prefix }
    // For now, send to console; could be wired to a remote sink later
    switch (level) {
      case "debug":
        console.debug(`[${this.prefix}]`, payload)
        break
      case "info":
        console.info(`[${this.prefix}]`, payload)
        break
      case "warn":
        console.warn(`[${this.prefix}]`, payload)
        break
      case "error":
        console.error(`[${this.prefix}]`, payload)
        break
    }
  }

  debug(message: string, context?: Record<string, any>) { this.emit("debug", message, context) }
  info(message: string, context?: Record<string, any>) { this.emit("info", message, context) }
  warn(message: string, context?: Record<string, any>) { this.emit("warn", message, context) }
  error(message: string, context?: Record<string, any>) { this.emit("error", message, context) }

  // simple performance timing helper
  time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    return fn().then((res) => {
      const end = performance.now()
      this.info(`${label} completed`, { duration_ms: Math.round(end - start) })
      return res
    }).catch((err) => {
      const end = performance.now()
      this.error(`${label} failed`, { duration_ms: Math.round(end - start), error: err?.message })
      throw err
    })
  }
}

export const logger = new Logger("nexus")