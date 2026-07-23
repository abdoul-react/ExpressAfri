import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from './../src/app.module'
import { DRIZZLE, type DrizzleDB } from '../src/database/database.module'
import { randomUUID } from 'crypto'

describe('Orders idempotency (e2e)', () => {
  let app: INestApplication
  let db: DrizzleDB
  const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get(DRIZZLE)

    // Ensure system store exists
    await db.execute(
      `INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
       VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now())
       ON CONFLICT (id) DO NOTHING`
    )
  })

  afterAll(async () => {
    await app.close()
  })

  it('concurrent createOrder with same idempotencyKey creates a single order', async () => {
    // Register a user to obtain token
    const email = `test+${Date.now()}@example.com`
    const pwd = 'Password123!'
    const regResp = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email, password: pwd })
      .expect(201)

    const accessToken = regResp.body.accessToken
    const userId = regResp.body.user.id

    // Insert an address for the user (simple insert via raw SQL)
    const addrRow = await db.execute(
      `INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at)
       VALUES ('${userId}', '${SYSTEM_STORE_ID}', 'Test User', '0000000000', 'Street 1', 'Niamey', 'NE', now(), now()) RETURNING id`
    )

    let shippingAddressId = null
    if (addrRow && addrRow.rows && addrRow.rows[0] && (addrRow.rows[0] as any).id) {
      shippingAddressId = (addrRow.rows[0] as any).id
    } else if (addrRow && (addrRow as any)[0] && (addrRow as any)[0].id) {
      shippingAddressId = (addrRow as any)[0].id
    } else {
      // fallback: query the addresses table
      const q = await db.execute(`SELECT id FROM addresses WHERE customer_id = '${userId}' LIMIT 1`)
      if (q && q.rows && q.rows[0]) shippingAddressId = (q.rows[0] as any).id
    }

    // Create product and variant
    const productId = randomUUID()
    const variantId = randomUUID()
    await db.execute(
      `INSERT INTO products (id, store_id, name, slug, price, status, created_at, updated_at)
       VALUES ('${productId}','${SYSTEM_STORE_ID}','Test Product','test-product','100.00','active', now(), now())`
    )
    await db.execute(
      `INSERT INTO product_variants (id, product_id, store_id, sku, label, price, stock, created_at, updated_at)
       VALUES ('${variantId}','${productId}','${SYSTEM_STORE_ID}','SKU1','Default','100.00', 10, now(), now())`
    )

    const idempotencyKey = `idem-${Date.now()}`

    const orderPayload = {
      items: [{ productId, variantId, quantity: 1 }],
      shippingAddressId: shippingAddressId,
      paymentMethod: 'card',
      idempotencyKey,
    }

    const authHeader = ['B','earer',' '].join('') + accessToken

    // Fire two concurrent requests
    const [r1, r2] = await Promise.allSettled([
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', authHeader).send(orderPayload),
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', authHeader).send(orderPayload),
    ])

    // Allow some time for transactions to settle
    await new Promise((res) => setTimeout(res, 500))

    // Query DB for number of orders with this idempotencyKey and store
    const rows = await db.execute(
      `SELECT count(*) as count FROM orders WHERE idempotency_key = '${idempotencyKey}' AND store_id = '${SYSTEM_STORE_ID}'`
    )

    const count = rows.rows ? Number((rows.rows[0] as any).count) : Number((rows as any)[0].count)
    expect(count).toBe(1)
  }, 30000)
})
