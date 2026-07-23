import { BadRequestException } from '@nestjs/common'
import * as fs from 'fs'
import path from 'path'
import os from 'os'

// We cannot mock image-size at module level because ts-jest doesn't
// apply the mock to import bindings. Instead, we isolate the module
// loading via jest.isolateModules.
function loadHelperWithMock(isOversized: boolean, isUnreadable: boolean) {
  jest.isolateModules(() => {
    jest.doMock('image-size', () => {
      return jest.fn().mockImplementation((filePath: string) => {
        if (isUnreadable) throw new Error('Cannot read dimensions')
        if (isOversized) return { width: 5000, height: 3000 }
        return { width: 800, height: 600 }
      })
    })
  })
}

describe('UploadHelper (scenario 13)', () => {
  const tmpDir = path.join(os.tmpdir(), 'upload-test-' + Date.now())

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  function writeFile(name: string, content: Buffer): string {
    const filePath = path.join(tmpDir, name)
    fs.writeFileSync(filePath, content)
    return filePath
  }

  describe('randomFilename', () => {
    it('generates a unique filename with original extension', () => {
      const { randomFilename } = require('./upload.helper')
      const name = randomFilename('photo.jpg')
      expect(name).toMatch(/^[0-9a-f-]+\.jpg$/)
    })
  })

  describe('validateFileContent — non-image rejection', () => {
    it('rejects non-image file pretending to be JPEG (scenario 13 — fake image)', () => {
      const { validateFileContent } = require('./upload.helper')
      const filePath = writeFile('fake.jpg', Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B]))
      expect(() => validateFileContent(filePath, 'image/jpeg')).toThrow(BadRequestException)
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('rejects executable pretending to be PNG', () => {
      const { validateFileContent } = require('./upload.helper')
      const filePath = writeFile('malicious.png', Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]))
      expect(() => validateFileContent(filePath, 'image/png')).toThrow(BadRequestException)
      expect(fs.existsSync(filePath)).toBe(false)
    })
  })
})
