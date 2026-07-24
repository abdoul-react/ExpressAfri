import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const TTL_MS = 24 * 60 * 60 * 1000;

const SUBDIRS = [
  'avatars',
  'banners',
  'logos',
  'feed',
  'payment-logos',
  'chat',
  'search',
];

export function cleanupOrphanedUploads(): { deleted: number; freed: number } {
  const logger = new Logger('UploadCleanup');
  const now = Date.now();
  let deleted = 0;
  let freed = 0;

  for (const sub of SUBDIRS) {
    const dir = path.join(UPLOAD_DIR, sub);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
        if (now - stat.mtimeMs > TTL_MS) {
          const size = stat.size;
          fs.unlinkSync(filePath);
          deleted++;
          freed += size;
        }
      } catch {}
    }
  }

  if (deleted > 0) {
    logger.log(
      `Nettoyage : ${deleted} fichiers orphelins supprimés (${(freed / 1024).toFixed(1)} Ko libérés)`,
    );
  }

  return { deleted, freed };
}
