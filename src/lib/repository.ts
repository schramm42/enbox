import { randomBytes } from 'node:crypto'
import { constants as FS } from 'node:fs'
import { access, lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { generateKey } from 'openpgp'
import { Blob } from './blob'
import { Bucket } from './bucket'
// import { BlockStorage } from "./BlockStorage";

export interface RepositoryConfig {
  email: string;
  directory: string;
}

interface Metadata {
  password: string;
  email: string;
}

export class Repository {
  static METADATA_FILENAME = 'metadata.json'
  static PUBLIC_KEY_FILENAME = 'public.key'
  static PRIVATE_KEY_FILENAME = 'private.key'
  static DOT_ENBOX_DIRNAME = '.enbox'
  static REVOCATION_CERTIFICATE_FILENAME = 'revocation.crt'
  protected config?: RepositoryConfig
  protected buckets?: Map<string, Bucket>
  protected type: string = 'striping'
  protected blobs?: Map<string, Blob> = new Map<string, Blob>();
  protected metadata?: Metadata;
  protected directory?: string;
  protected privateKey?: string;
  protected publicKey?: string;
  protected revocationCertificate?: string;

  constructor(config: RepositoryConfig) {
    this.config = config

    this.setDirectory(config.directory)
  }

  public async init(): Promise<void> {
    const repositoryDirStat = await lstat(this.directory!)

    if (!repositoryDirStat.isDirectory()) {
      // TODO: maybe create this directory
      throw new Error(`${this.directory!} is not a directory`)
    }

    if (await this.isInitialized()) {
      throw new Error(`${this.directory!} is already exists`)
    }

    await mkdir(this.getDotEnboxDirname())

    // TODO: create metadata
    this.metadata = {
      password: randomBytes(32).toString('hex'),
      email: this.config!.email
    }
    // TODO: create public key
    // TODO: create private key
    const { privateKey, publicKey, revocationCertificate } = await generateKey({
      type: 'ecc', // Type of the key, defaults to ECC
      curve: 'curve25519', // ECC curve name, defaults to curve25519
      userIDs: [{email: this.config!.email}], // you can pass multiple user IDs
      passphrase: this.metadata!.password, // protects the private key
      format: 'armored' // output key format, defaults to 'armored' (other options: 'binary' or 'object')
    })
    this.privateKey = privateKey
    this.publicKey = publicKey
    this.revocationCertificate = revocationCertificate

    // TODO: save metadata and keys
    const publicKeyFilename = join(this.getDotEnboxDirname(), Repository.PUBLIC_KEY_FILENAME)
    await writeFile(publicKeyFilename, this.publicKey!)
    const privateKeyFilename = join(this.getDotEnboxDirname(), Repository.PRIVATE_KEY_FILENAME)
    await writeFile(privateKeyFilename, this.privateKey!)
    const revocationCertFilename = join(this.getDotEnboxDirname(), Repository.REVOCATION_CERTIFICATE_FILENAME)
    await writeFile(revocationCertFilename, this.revocationCertificate!)
    const metadataFilename = join(this.getDotEnboxDirname(), Repository.METADATA_FILENAME)
    await writeFile(metadataFilename, JSON.stringify(this.metadata))
  }

  public setDirectory(directory: string): this {
    this.directory = resolve(directory)
    // TODO: if initialized then load

    return this
  }

  public async load(): Promise<void> {
    const metadataFilename = join(this.getDotEnboxDirname(), Repository.METADATA_FILENAME)
    const rawMetadata = await readFile(metadataFilename)
    this.metadata = JSON.parse(rawMetadata.toString())
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
    return join(this.directory!, Repository.DOT_ENBOX_DIRNAME)
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
}
