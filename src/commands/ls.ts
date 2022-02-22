import { Command } from '@oclif/core'
import { Config, Enbox } from '../lib/enbox'
import BaseCommand from './base'

export default class Ls extends BaseCommand {
  static description = 'List blobs'
  static examples = [
    `$ oex hello world
hello world! (./src/commands/hello/world.ts)
`,
  ]

  static flags = {}
  static args = [
    {
      name: 'dir',
      required: false,
      default: process.env.PWD
    }
  ]

  static aliases = ['index', 'list']

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Ls)
    const config: Config = { directory: args.dir }
    const enbox = new Enbox(config, this.logger)
    enbox.load()
  }
}
