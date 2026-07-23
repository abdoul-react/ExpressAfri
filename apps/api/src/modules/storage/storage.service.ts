import { Injectable } from '@nestjs/common'
import { join } from 'path'
import { mkdirSync, createWriteStream, existsSync, readFileSync } from 'fs'
import { unlink } from 'fs/promises'

export interface StorageService {
  save(key: string, buffer: Buffer, contentType?: string): Promise<string>
  getUrl(key: string, ttl?: number): Promise<string>
  delete(key: string): Promise<void>
}

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly baseDir: string
  private readonly baseUrl: string

  constructor() {
    this.baseDir = join(process.cwd(), 'uploads')
    this.baseUrl = '/uploads'
  }

  async save(key: string, buffer: Buffer, _contentType?: string): Promise<string> {
    const filepath = join(this.baseDir, key)
    const dir = filepath.slice(0, filepath.lastIndexOf('\\'))
    mkdirSync(dir, { recursive: true })
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filepath)
      stream.write(buffer)
      stream.end()
      stream.on('finish', resolve)
      stream.on('error', reject)
    })
    return `${this.baseUrl}/${key.replace(/\\/g, '/')}`
  }

  async getUrl(key: string, _ttl?: number): Promise<string> {
    return `${this.baseUrl}/${key.replace(/\\/g, '/')}`
  }

  async delete(key: string): Promise<void> {
    const filepath = join(this.baseDir, key)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  }
}
