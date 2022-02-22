import { Flags } from '@oclif/core'
import inquirer from 'inquirer'
import isEmail from 'validator/lib/isEmail'
import { Config, Enbox } from '../lib/enbox'
import BaseCommand, { LogLevel } from './base'
import colors from 'colors'

export default class Init extends BaseCommand {
  static description = 'Init a new repository'

  static examples = [
    `$ oex hello world
hello world! (./src/commands/hello/world.ts)
`,
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    email: Flags.string({ char: 'e', name: 'email' })
  }

  static args = [
    {
      name: 'dir',
      required: false,
      default: process.env.PWD
    }
  ]

  async run(): Promise<void> {
    try {
      this.log(colors.green.underline('Initialize a new enbox repository'))
      const { args, flags } = await this.parse(Init)
      // console.log(args, flags)
      let email
      if (!flags.email) {
        let responses: any = await inquirer.prompt([{
          name: 'email',
          message: 'What is your email',
          type: 'input',
          validate: async (input: string) => {
            return isEmail(input)
          }
        }])
        email = responses.email
      } else {
        email = flags.email
      }

      const config: Config = { directory: args.dir, email: email }
      const enbox = new Enbox(config, this.logger)
      await enbox.init()
    } catch (error) {
      const e = error as Error
      this.log(colors.red(e.message), LogLevel.error)
      // this.error(error as Error)
    }
  }
}
