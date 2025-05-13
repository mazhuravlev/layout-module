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

  private formatMessage(message: string): string {
    return `[${this._name}] ${message}`
  }

  public debug(message: string): void {
    if (this._logLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(message))
    }
  }

  public info(message: string): void {
    if (this._logLevel <= LogLevel.INFO) {
      console.info(this.formatMessage(message))
    }
  }

  public warn(message: string): void {
    if (this._logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage(message))
    }
  }

  public error(message: string, e: Error): void {
    if (this._logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage(message), e)
    }
  }
}
