import { createReadStream, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename } from 'node:path'
// import { encrypt, getKeyFromPassword, getSalt } from "./Cryptor";
import { Block } from './block'

export class Blob {
  protected name?: string;
  protected filename?: string;
  protected fileHash?: string;
  protected salt?: Buffer;
  protected password?: string;
  protected blockSize: number = 16 * 1024;
  protected hashAlgorithm: string = 'sha512';
  protected contentBlocks?: Map<string, Block>;

  // constructor() {
  //   this.salt = getSalt()
  // }

  public static async create(filename: string): Promise<Blob> {
    const blob = new Blob()

    return blob.setFilename(filename)
  }

  protected createHash(data: string | Buffer): string {
    return createHash(this.hashAlgorithm).update(data).digest('hex')
  }

  public setFilename(filename: string): this {
    this.filename = filename

    return this
  }

  public countBlocks(): number {
    if (!this.contentBlocks) {
      return 0
    }

    return this.contentBlocks!.size
  }

  public getBlocks(): Map<string, Block> | undefined {
    return this.contentBlocks
  }

  public getName(): string | undefined {
    return this.name
  }

  public async loadContent(): Promise<void> {
    if (!this.filename) {
      throw new Error('filename is not set')
    }

    this.name = basename(this.filename!)
    this.contentBlocks = new Map()

    // let key = ''; //getKeyFromPassword(this.password!, this.salt!)

    await new Promise<void>((resolve) => {
      let rs = createReadStream(this.filename!, { highWaterMark: this.blockSize })
      rs.on('data', () => {
        const block: Block = new Block()
        // block.setContent(data, key)
        // let blockHash = this.createHash(data);
        // let encData = encrypt(data, key);

        this.contentBlocks!.set(block.getHash()!, block)
      })

      rs.on('end', () => {
        //fs.writeFileSync(OUT+"/"+fn+".json", JSON.stringify(meta));
        rs.close()
        resolve()
      })
    })
  }

  public async saveContent(filename: string): Promise<void> {
    if (!this.password) {
      throw new Error('Password not set')
    }
    if (!this.contentBlocks) {
      throw new Error(`Blob ${this.name!} has no content`)
    }

    // let key = getKeyFromPassword(this.password!, this.salt!)

    await new Promise<void>((resolve, reject) => {
      let ws = createWriteStream(filename)

      for (let blockId of this.contentBlocks!.keys()) {
        let block = this.contentBlocks!.get(blockId)
        // let blockContent = block?.getContent(key)
        // ws.write(blockContent)
      }

      ws.on('finish', () => {
        ws.close()
        resolve()
      })
    })
  }

  public setPassword(password: string): this {
    this.password = password

    return this
  }

  public setBlockSize(blockSize: number): this {
    this.blockSize = blockSize

    return this
  }
}
