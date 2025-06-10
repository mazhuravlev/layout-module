/* eslint-disable no-console */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private _logLevel: LogLevel = LogLevel.DEBUG
  private _name: string = 'Default'

  public constructor(name: string) {
    this._name = name
  }

  public setLogLevel(level: LogLevel): void {
    this._logLevel = level
  }

  private formatMessage(message: string, logLevel: LogLevel): string {
    return `[${this._name}:${this.formatLogLevel(logLevel)}] ${message}`
  }

  private formatLogLevel(logLevel: LogLevel) {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return 'debug'
      case LogLevel.INFO:
        return 'info'
      case LogLevel.WARN:
        return 'warn'
      case LogLevel.ERROR:
        return 'error'
      default:
        return 'unknown'
    }
  }

  public debug(message: string): void {
    if (this._logLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(message, LogLevel.DEBUG))
    }
  }

  public info(message: string): void {
    if (this._logLevel <= LogLevel.INFO) {
      console.info(this.formatMessage(message, LogLevel.INFO))
    }
  }

  public warn(message: string): void {
    if (this._logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage(message, LogLevel.WARN))
    }
  }

  public error(message: string, e: Error): void {
    if (this._logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage(message, LogLevel.ERROR), e)
    }
  }
}
