import { assertDefined } from './func'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private logLevel: LogLevel = LogLevel.DEBUG
  private name: string = 'Default'

  public constructor(name: string) {
    this.name = name
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private formatMessage(message: string): string {
    return `[${this.name}] ${message}`
  }

  public debug(message: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(message))
    }
  }

  public info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(this.formatMessage(message))
    }
  }

  public warn(message: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage(message))
    }
  }

  public error(message: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage(message))
    }
  }
}
