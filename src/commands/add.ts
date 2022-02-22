import {Command} from '@oclif/core'

export default class Add extends Command {
  static description = 'add blob'

  static examples = [
    `$ oex hello world
hello world! (./src/commands/hello/world.ts)
`,
  ]

  static flags = {}

  static args = []

  async run(): Promise<void> {
    this.log('add')
  }
}
