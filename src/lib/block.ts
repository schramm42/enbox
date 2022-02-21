import { createHash, constants as cryptoConstants, randomBytes, createCipheriv, CipherCCM, CipherGCMTypes, createDecipheriv } from 'node:crypto'
// import { decrypt, encrypt } from "./Cryptor";

export class Block {
  protected encryptedContent?: string;
  protected hash?: string;
  protected algorithm: string = 'sha512';
  protected initializationVector?: string;
  protected ivByteLen: number = 12;
  protected blockCipher: CipherGCMTypes = 'aes-256-gcm';
  protected authTagByteLen: number = 16;
  protected key?: string | Buffer;
  protected authTag?: Buffer;

  // constructor(algorithm: string) {
  //     this.algorithm = algorithm;
  // }

  public setKey(key: string | Buffer): this {
    this.key = key

    return this
  }

  public setContent(content: string | Buffer): this {
    const rawContent = typeof content !== 'string' ? content.toString() : content
    this.hash = this.createHash(rawContent)
    this.encrypt(rawContent)
    // this.encryptedContent = this.encrypt(rawContent, key).toString();

    return this
  }

  protected encrypt(
    messageText: string | Buffer
  ): void {
    this.initializationVector = randomBytes(this.ivByteLen).toString('hex')
    const cipher: CipherCCM = createCipheriv(this.blockCipher, this.key!, this.initializationVector)
    const encryptedMessage = cipher.update(messageText)
    this.encryptedContent = Buffer.concat([encryptedMessage, cipher.final()]).toString('hex')
    // this.authTag = cipher.getAuthTag();

    // return Buffer.concat([iv, encryptedMessage, cipher.getAuthTag()]);
  }

  // protected getDecrypt(): string | Buffer {
  //   const decipher = createDecipheriv(this.blockCipher, this.key!, this.initializationVector, {
  //     authTagLength: this.authTagByteLen,
  //   })
  //   decipher.setAuthTag(this.authTag!)
  //   const messagetext = decipher.update(this.encryptedContent!)
  // }

  public getContent(key: string | Buffer): string | Buffer {
    // return this.getDecrypt()
    console.log(key)
    return ''
  }

  protected createHash(content: string): string {
    return createHash(this.algorithm).update(content).digest('hex')
  }

  public getHash(): string | undefined {
    return this.hash
  }
}
