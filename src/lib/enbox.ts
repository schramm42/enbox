import { randomBytes } from 'node:crypto'
import { constants as FS } from 'node:fs'
import { access, lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { decryptKey, generateKey, PrivateKey, PublicKey, readKey, readPrivateKey } from 'openpgp'
import { Logger } from 'winston'
import colors from 'colors'
import { Blob } from './blob'
import { Bucket } from './bucket'
import { LogLevel } from '../commands/base'

export interface Config {
  email?: string;
  directory: string;
}

interface Metadata {
  password: string;
  email: string;
}

export class Enbox {
  static METADATA_FILENAME = 'metadata.json'
  static PUBLIC_KEY_FILENAME = 'public.key'
  static PRIVATE_KEY_FILENAME = 'private.key'
  static DOT_ENBOX_DIRNAME = '.enbox'
  static REVOCATION_CERTIFICATE_FILENAME = 'revocation.crt'
  protected logger?: Logger
  protected email?: string
  protected buckets?: Map<string, Bucket>
  protected type: string = 'striping'
  protected blobs?: Map<string, Blob> = new Map<string, Blob>();
  protected metadata?: Metadata;
  protected directory?: string;
  protected privateKey?: PrivateKey;
  protected publicKey?: PublicKey;
  protected revocationCertificate?: string;

  constructor(config: Config, logger?: Logger) {
    this.email = config.email
    this.logger = logger

    this.directory = resolve(config.directory)
  }

  public async init(): Promise<void> {
    const dirExists = await this.pathExists(this.directory!)
    if (!dirExists) {
      this.log(`${this.directory!} doesn't exists. Try to create it...`, LogLevel.debug)
      await mkdir(this.directory!, { recursive: true })
    }

    const repositoryDirStat = await lstat(this.directory!)
    if (!repositoryDirStat.isDirectory()) {
      throw new Error(`${this.directory!} is not a directory`)
    }

    if (await this.isInitialized()) {
      throw new Error(`${this.directory!} is already exists`)
    }

    if (!this.email) {
      throw new Error('Email is required')
    }

    this.log(`Creating ${this.getDotEnboxDirname()}...`, LogLevel.debug)
    await mkdir(this.getDotEnboxDirname())

    this.metadata = {
      password: randomBytes(32).toString('hex'),
      email: this.email!
    }

    const { privateKey, publicKey, revocationCertificate } = await generateKey({
      type: 'ecc', // Type of the key, defaults to ECC
      curve: 'curve25519', // ECC curve name, defaults to curve25519
      userIDs: [{ email: this.metadata.email! }], // you can pass multiple user IDs
      passphrase: this.metadata!.password, // protects the private key
      format: 'armored' // output key format, defaults to 'armored' (other options: 'binary' or 'object')
    })
    this.privateKey = await decryptKey({
      privateKey: await readPrivateKey({ armoredKey: privateKey }),
      passphrase: this.metadata!.password
    })
    this.publicKey = await readKey({ armoredKey: publicKey })
    this.revocationCertificate = revocationCertificate

    await this.save()
  }

  public async load(): Promise<void> {
    const metadataFilename = join(this.getDotEnboxDirname(), Enbox.METADATA_FILENAME)
    const rawMetadata = await readFile(metadataFilename)
    this.metadata = JSON.parse(rawMetadata.toString())
  }

  public async save(): Promise<void> {
    const publicKeyFilename = join(this.getDotEnboxDirname(), Enbox.PUBLIC_KEY_FILENAME)
    await writeFile(publicKeyFilename, this.publicKey!.armor())
    const privateKeyFilename = join(this.getDotEnboxDirname(), Enbox.PRIVATE_KEY_FILENAME)
    await writeFile(privateKeyFilename, this.privateKey!.armor())
    const revocationCertFilename = join(this.getDotEnboxDirname(), Enbox.REVOCATION_CERTIFICATE_FILENAME)
    await writeFile(revocationCertFilename, this.revocationCertificate!)
    const metadataFilename = join(this.getDotEnboxDirname(), Enbox.METADATA_FILENAME)
    await writeFile(metadataFilename, JSON.stringify(this.metadata))
  }

  public async import(filename: string): Promise<void> {
    if (filename.length === 0) {
      throw new Error('filename is not set')
    }

    if (!await this.isValidFile(filename)) {
      throw new Error(`invalid file: ${filename}`)
    }

    const blob = new Blob()
    blob.setFilename(filename)
    await this.addBlob(blob)
  }

  public async export(blobName: string, filename: string): Promise<void> {
    const blob = this.getBlob(blobName)
    blob.saveContent(filename)
  }

  public async addBlob(blob: Blob): Promise<void> {
    // blob.setPassword(this.config!.password)
    await blob.loadContent()
    this.blobs!.set(blob.getName()!, blob)
  }

  public getBlobs(): Map<string, Blob> | undefined {
    return this.blobs
  }

  public getBlob(blobName: string): Blob {
    if (!this.blobs!.has(blobName)) {
      throw new Error(`Blob ${blobName} not found`)
    }

    return this.blobs!.get(blobName)!
  }

  protected getDotEnboxDirname(): string {
    return join(this.directory!, Enbox.DOT_ENBOX_DIRNAME)
  }

  protected async isInitialized(): Promise<boolean> {
    const initialized = await this.pathExists(this.getDotEnboxDirname())

    return initialized
  }

  protected async pathExists(path: string): Promise<boolean> {
    try {
      await access(path, FS.F_OK)

      return true
    } catch {
      return false
    }
  }

  protected async loadPrivateKey(): Promise<void> {
    const privateKeyFilename = join(this.getDotEnboxDirname(), Enbox.PRIVATE_KEY_FILENAME)
    const privateKeyArmored = await readFile(privateKeyFilename)
    this.privateKey = await decryptKey({
      privateKey: await readPrivateKey({ armoredKey: privateKeyArmored.toString() }),
      passphrase: this.metadata!.password
    })
  }

  public async getPrivateKey(): Promise<PrivateKey> {
    if (!this.privateKey) {
      await this.loadPrivateKey()
    }

    return this.privateKey!
  }

  protected async loadPublicKey(): Promise<void> {
    const publicKeyFilename = join(this.getDotEnboxDirname(), Enbox.PUBLIC_KEY_FILENAME)
    const publicKeyArmored = await readFile(publicKeyFilename)
    this.publicKey = await readKey({ armoredKey: publicKeyArmored.toString() })
  }

  public async getPublicKey(): Promise<PublicKey> {
    if (!this.publicKey) {
      await this.loadPublicKey()
    }

    return this.publicKey!
  }

  protected async isValidFile(filename: string): Promise<boolean> {
    try {
      // const ac = await access(filename)
      const stat = await lstat(filename)
      if (!stat.isFile()) {
        throw new Error(`invalid file: ${filename}`)
      }

      return true
    } catch {
      return false
    }
  }

  protected log(message: string, level?: string): this {
    if (!this.logger) {
      return this
    }

    if (level === LogLevel.debug) {
      message = colors.grey(message)
    }

    this.logger.log(level || 'info', message)

    return this
  }
}
