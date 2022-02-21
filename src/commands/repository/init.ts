import { Command, Flags } from '@oclif/core'
import inquirer from 'inquirer'
import isEmail from 'validator/lib/isEmail'
import { Repository } from '../../lib/repository'

// interface RepositoryInitFlags { }

export default class RepositoryInit extends Command {
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

  static args = [{ name: 'dir' }]

  async run(): Promise<void> {
    try {
      this.log('Initialize a new enbox repository')
      const { args, flags } = await this.parse(RepositoryInit)
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

      const repository = new Repository({ directory: args.dir, email: email })
      repository.init()
    } catch (error) {
      this.error(error as Error)
    }
  }
}
