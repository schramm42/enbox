import { Command } from '@oclif/core'
import { createLogger, Logger, format as LogFormat } from 'winston'
import { Console } from 'winston/lib/winston/transports'

export enum LogLevel {
  emerg = 'emerg',
  alert = 'alert',
  crit = 'crit',
  error = 'error',
  warning = 'warning',
  notice = 'notice',
  info = 'info',
  debug = 'debug'
}

export default abstract class BaseCommand extends Command {
  protected logger?: Logger;

  public async init(): Promise<void> {
    // do some initialization
    this.logger = createLogger(
      {
        level: LogLevel.debug,
        format: LogFormat.cli(),
        transports: [
          new Console()
        ]
      }
    )
  }

  public log(message: string, level?: LogLevel): this {
    if (!this.logger) {
      return this
    }

    this.logger.log(level?.toString() || LogLevel.info, message)

    return this
  }
}
