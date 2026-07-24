import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from './database/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema }) as any;

async function main() {
  console.log('Resetting database to minimal state (auth only)...');

  await db.execute(`TRUNCATE TABLE
    "ticket_messages", "admin_tickets", "internal_messages",
    "affiliate_commissions", "coupon_usage",
    "order_items", "order_status_log", "orders",
    "product_variants", "product_images", "products",
    "coupons", "categories",
    "store_kyc", "affiliates",
    "customers", "stores",
    "app_settings", "feature_flags",
    "banners", "static_pages", "logos",
    "feed_sections", "social_links",
    "seo_metadata", "payment_methods",
    "content_blocks", "wishlist_items", "conversations", "messages"
  CASCADE`);
  console.log('  ✓ All business tables cleared');

  await db.execute(`DELETE FROM "admins"`);
  await db.execute(`DELETE FROM "roles"`);

  const [roleSuperAdmin] = await db
    .insert(schema.roles)
    .values({
      label: 'Super Admin',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: ['*'],
      isSuperAdmin: true,
    })
    .returning();
  console.log(`  ✓ Role created: ${roleSuperAdmin.label}`);

  const hash = await bcrypt.hash('admin123', 10);
  const [admin] = await db
    .insert(schema.admins)
    .values({
      email: 'admin@expressafri.com',
      name: 'Admin Principal',
      passwordHash: hash,
      role: 'super_admin',
      isSuperAdmin: true,
      isActive: true,
    })
    .returning();
  console.log(`  ✓ Admin created: ${admin.email} / admin123`);

  console.log('\n✅ Database reset complete. Auth only.');
  console.log('   Admin login: admin@expressafri.com / admin123');
  await pool.end();
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
