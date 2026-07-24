import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import imageSize from 'image-size';

const MAGIC_BYTES: {
  ext: string;
  mime: string;
  bytes: number[];
  offset: number;
}[] = [
  { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { ext: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { ext: 'gif', mime: 'image/gif', bytes: [0x47, 0x49, 0x46], offset: 0 },
  {
    ext: 'webp',
    mime: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
  },
  {
    ext: 'ico',
    mime: 'image/x-icon',
    bytes: [0x00, 0x00, 0x01, 0x00],
    offset: 0,
  },
  { ext: 'mp4', mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  {
    ext: 'webm',
    mime: 'video/webm',
    bytes: [0x1a, 0x45, 0xdf, 0xa3],
    offset: 0,
  },
  {
    ext: 'pdf',
    mime: 'application/pdf',
    bytes: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
  },
  { ext: 'mp3', mime: 'audio/mpeg', bytes: [0x49, 0x44, 0x33], offset: 0 },
  { ext: 'wav', mime: 'audio/wav', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { ext: 'aac', mime: 'audio/aac', bytes: [0xff, 0xf1], offset: 0 },
  {
    ext: '3gp',
    mime: 'video/3gpp',
    bytes: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
  },
  {
    ext: 'mov',
    mime: 'video/quicktime',
    bytes: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
  },
];

export function randomFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  return `${randomUUID()}${ext}`;
}

export function validateFileContent(
  filePath: string,
  allowedMimePrefix: string,
): void {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(12);
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  const category = allowedMimePrefix.split('/')[0];
  const candidates = MAGIC_BYTES.filter(
    (s) =>
      s.mime.startsWith(category) ||
      s.mime === allowedMimePrefix ||
      allowedMimePrefix.startsWith(s.mime),
  );

  if (candidates.length === 0) return;

  const ok = candidates.some((sig) => {
    if (buffer.length < sig.offset + sig.bytes.length) return false;
    return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
  });

  if (!ok) {
    fs.unlinkSync(filePath);
    throw new BadRequestException(
      'Le contenu du fichier ne correspond pas au type attendu',
    );
  }

  if (allowedMimePrefix.startsWith('image/')) {
    try {
      const dimensions = imageSize(filePath);
      if (dimensions.width && dimensions.height) {
        const MAX_DIM = 4096;
        if (dimensions.width > MAX_DIM || dimensions.height > MAX_DIM) {
          fs.unlinkSync(filePath);
          throw new BadRequestException(
            `Dimensions de l'image trop grandes (max ${MAX_DIM}x${MAX_DIM}px)`,
          );
        }
      }
    } catch {
      fs.unlinkSync(filePath);
      throw new BadRequestException(
        "Impossible de lire les dimensions de l'image",
      );
    }
  }
}
