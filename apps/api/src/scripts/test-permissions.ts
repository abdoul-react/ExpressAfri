import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const admins = await pool.query('SELECT id, name, role, is_super_admin FROM admins ORDER BY created_at')

  console.log('\n=== Test de résolution des permissions ===\n')

  for (const a of admins.rows) {
    let perms: string[] | string

    if (a.is_super_admin) {
      perms = '*'
    } else {
      const r = await pool.query('SELECT permissions, is_super_admin FROM roles WHERE id = $1', [a.role])
      if (!r.rows[0]) {
        perms = `[] ← RÔLE INTROUVABLE (role_id: ${a.role})`
      } else {
        const role = r.rows[0]
        const isFullAccess = role.is_super_admin ||
          (Array.isArray(role.permissions) && role.permissions.includes('*'))
        perms = isFullAccess ? '*' : (role.permissions ?? [])
      }
    }

    console.log(`👤 ${a.name}`)
    console.log(`   role: ${a.role}`)
    console.log(`   permissions: ${JSON.stringify(perms)}`)
    console.log()
  }

  // Test wildcard
  console.log('=== Test wildcard ===')
  function matchPerm(userPerms: string[], required: string): boolean {
    return userPerms.some((p) => {
      if (p === required) return true
      if (p.endsWith('.*')) return required.startsWith(p.slice(0, -2) + '.')
      return false
    })
  }

  const marketingPerms = ['coupons.*', 'affiliates.*', 'analytics.read', 'campaigns.read']
  const tests = ['coupons.read', 'coupons.create', 'coupons.delete', 'affiliates.read', 'orders.read', 'analytics.read']
  for (const t of tests) {
    console.log(`  ${t}: ${matchPerm(marketingPerms, t) ? '✓ autorisé' : '✗ refusé'}`)
  }

  await pool.end()
}

main().catch((e) => { console.error(e.message); pool.end() })
