import { readFileSync } from 'fs'
import { Pool } from 'pg'
const env = readFileSync('.env', 'utf8')
const url = env.match(/DATABASE_URL=(.+)/)?.[1] ?? 'postgres://postgres:postgres@localhost:5432/expressafri'
const p = new Pool({ connectionString: url.trim() })
try {
  await p.query('ALTER TABLE admin_tickets ADD COLUMN IF NOT EXISTS chat_conversation_id uuid')
  console.log('OK: admin_tickets.chat_conversation_id')
  await p.query('ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS brand_name text')
  console.log('OK: receipt_settings.brand_name')
  await p.query('ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS logo_url text')
  console.log('OK: receipt_settings.logo_url')
  await p.query('ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS show_barcode boolean DEFAULT false')
  console.log('OK: receipt_settings.show_barcode')
  await p.query("ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#f97316'")
  console.log('OK: receipt_settings.accent_color')
} catch(e) { console.error(e.message) }
finally { await p.end() }
