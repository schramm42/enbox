import {Command} from '@oclif/core'

export default class Rm extends Command {
  static description = 'Remove blob'

  static examples = [
    `$ oex hello world
hello world! (./src/commands/hello/world.ts)
`,
  ]

  static flags = {}
  static args = []
  static aliases = ['remove']

  async run(): Promise<void> {
    this.log('rm')
  }
}
