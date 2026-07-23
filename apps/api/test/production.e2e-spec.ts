import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from './../src/app.module'
import { DRIZZLE, type DrizzleDB } from '../src/database/database.module'
import { randomUUID } from 'crypto'
import { payments } from '../src/database/schema/payments'

describe('Production readiness e2e (Phase F) - skeleton', () => {
  let app: INestApplication
  let db: DrizzleDB

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get(DRIZZLE)
  })

  afterAll(async () => {
    await app.close()
  })

  it('price falsification scenario - server recalculates totals (e2e)', async () => {
    // Register a user to obtain token
    const email = `test+${Date.now()}@example.com`
    const pwd = 'Password123!'
    const regResp = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email, password: pwd })
      .expect(201)

    const accessToken = regResp.body.accessToken
    const userId = regResp.body.user.id

    // Ensure system store exists
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'
    await db.execute(
      `INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
       VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now())
       ON CONFLICT (id) DO NOTHING`
    )

    // Insert an address for the user
    const addrRow = await db.execute(
      `INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at)
       VALUES ('${userId}', '${SYSTEM_STORE_ID}', 'Test User', '0000000000', 'Street 1', 'Niamey', 'NE', now(), now()) RETURNING id`
    )

    let shippingAddressId = null
    if (addrRow && addrRow.rows && addrRow.rows[0] && addrRow.rows[0].id) {
      shippingAddressId = addrRow.rows[0].id
    } else if (addrRow && addrRow[0] && addrRow[0].id) {
      shippingAddressId = addrRow[0].id
    } else {
      const q = await db.execute(`SELECT id FROM addresses WHERE customer_id = '${userId}' LIMIT 1`)
      if (q && q.rows && q.rows[0]) shippingAddressId = q.rows[0].id
    }

    // Create product and variant with known price
    const productId = randomUUID()
    const variantId = randomUUID()
    const unitPrice = 123.45
    await db.execute(
      `INSERT INTO products (id, store_id, name, slug, price, status, created_at, updated_at)
       VALUES ('${productId}','${SYSTEM_STORE_ID}','Test Product','test-product','${unitPrice}','active', now(), now())`
    )
    await db.execute(
      `INSERT INTO product_variants (id, product_id, store_id, sku, label, price, stock, created_at, updated_at)
       VALUES ('${variantId}','${productId}','${SYSTEM_STORE_ID}','SKU1','Default','${unitPrice}', 10, now(), now())`
    )

    const idempotencyKey = `price-falsify-${Date.now()}`

    const orderPayload: any = {
      items: [{ productId, variantId, quantity: 1 }],
      shippingAddressId: shippingAddressId,
      paymentMethod: 'card',
      idempotencyKey,
      // Attempt to supply a falsified total (server should ignore this field)
      clientTotal: 1
    }

    const authHeader = 'Bearer ' + accessToken
    const resp = await request(app.getHttpServer())
      .post('/mobile/orders')
      .set('Authorization', authHeader)
      .send(orderPayload)
      .expect(201)

    // Fetch the stored order and its items to validate server-side calculation
    const orderRows = await db.execute(
      `SELECT id, subtotal, shipping_cost, discount_amount, total FROM orders WHERE idempotency_key = '${idempotencyKey}' AND store_id = '${SYSTEM_STORE_ID}' LIMIT 1`
    )
    const orderRow = orderRows && orderRows.rows && orderRows.rows[0] ? orderRows.rows[0] : orderRows[0]
    expect(orderRow).toBeDefined()

    const itemsRows = await db.execute(
      `SELECT coalesce(sum(total_price), 0) as items_total FROM order_items WHERE order_id = '${orderRow.id}'`
    )
    const itemsTotal = itemsRows && itemsRows.rows && itemsRows.rows[0] ? Number(itemsRows.rows[0].items_total) : Number(itemsRows[0].items_total)

    // subtotal should equal sum of order_items.total_price
    expect(Number(orderRow.subtotal)).toBeCloseTo(itemsTotal, 2)

    // total should equal subtotal + shippingCost - discountAmount
    const expectedTotal = Number(orderRow.subtotal) + Number(orderRow.shipping_cost || 0) - Number(orderRow.discount_amount || 0)
    expect(Number(orderRow.total)).toBeCloseTo(expectedTotal, 2)

    // And ensure it's not equal to the malicious clientTotal
    expect(Number(orderRow.total)).not.toBe(1)
  }, 30000)

  it('double checkout idempotency scenario - concurrent createOrder creates single order (e2e)', async () => {
    const email = `idem-test+${Date.now()}@example.com`
    const pwd = 'Password123!'
    const regResp = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Idem', lastName: 'Test', email, password: pwd })
      .expect(201)

    const accessToken = regResp.body.accessToken
    const userId = regResp.body.user.id

    // Ensure system store
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'

    await db.execute(
      `INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
       VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now())
       ON CONFLICT (id) DO NOTHING`
    )

    // Address
    const addrRow = await db.execute(
      `INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at)
       VALUES ('${userId}', '${SYSTEM_STORE_ID}', 'Idem Test', '0000000000', 'Street 2', 'Niamey', 'NE', now(), now()) RETURNING id`
    )
    let shippingAddressId = null
    if (addrRow && addrRow.rows && addrRow.rows[0] && addrRow.rows[0].id) {
      shippingAddressId = addrRow.rows[0].id
    } else if (addrRow && addrRow[0] && addrRow[0].id) {
      shippingAddressId = addrRow[0].id
    } else {
      const q = await db.execute(`SELECT id FROM addresses WHERE customer_id = '${userId}' LIMIT 1`)
      if (q && q.rows && q.rows[0]) shippingAddressId = q.rows[0].id
    }

    // Product
    const productId = randomUUID()
    const variantId = randomUUID()
    await db.execute(
      `INSERT INTO products (id, store_id, name, slug, price, status, created_at, updated_at)
       VALUES ('${productId}','${SYSTEM_STORE_ID}','Idem Product','idem-product','50.00','active', now(), now())`
    )
    await db.execute(
      `INSERT INTO product_variants (id, product_id, store_id, sku, label, price, stock, created_at, updated_at)
       VALUES ('${variantId}','${productId}','${SYSTEM_STORE_ID}','SKU-IDEM','Default','50.00', 10, now(), now())`
    )

    const idempotencyKey = `idem-e2e-${Date.now()}`
    const orderPayload = { items: [{ productId, variantId, quantity: 1 }], shippingAddressId, paymentMethod: 'card', idempotencyKey }
    const authHeader = 'Bearer ' + accessToken

    // Send two concurrent requests with same idempotencyKey
    const [p1, p2] = await Promise.allSettled([
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', authHeader).send(orderPayload),
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', authHeader).send(orderPayload),
    ])

    // small wait
    await new Promise((r) => setTimeout(r, 300))

    const rows = await db.execute(
      `SELECT count(*) as count FROM orders WHERE idempotency_key = '${idempotencyKey}' AND store_id = '${SYSTEM_STORE_ID}'`
    )
    const count = rows && rows.rows && rows.rows[0] ? Number(rows.rows[0].count) : Number(rows[0].count)
    expect(count).toBe(1)
  }, 30000)

  it('stock concurrency scenario - two concurrent orders on last stock unit result in single fulfillment (e2e)', async () => {
    // Register two users
    const email1 = `stock1+${Date.now()}@example.com`
    const email2 = `stock2+${Date.now()}@example.com`
    const pwd = 'Password123!'

    const reg1 = await request(app.getHttpServer()).post('/mobile/auth/register').send({ firstName: 'A', lastName: 'One', email: email1, password: pwd }).expect(201)
    const reg2 = await request(app.getHttpServer()).post('/mobile/auth/register').send({ firstName: 'B', lastName: 'Two', email: email2, password: pwd }).expect(201)
    const token1 = reg1.body.accessToken
    const token2 = reg2.body.accessToken
    const user1 = reg1.body.user.id
    const user2 = reg2.body.user.id

    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'
    await db.execute(`INSERT INTO stores (id, name, email, country, status, created_at, updated_at) VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now()) ON CONFLICT (id) DO NOTHING`)

    // create addresses for both users
    await db.execute(`INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at) VALUES ('${user1}', '${SYSTEM_STORE_ID}', 'User One', '000', 'Street X', 'Niamey', 'NE', now(), now())`)
    await db.execute(`INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at) VALUES ('${user2}', '${SYSTEM_STORE_ID}', 'User Two', '000', 'Street Y', 'Niamey', 'NE', now(), now())`)

    // product with stock = 1
    const productId = randomUUID()
    const variantId = randomUUID()
    await db.execute(`INSERT INTO products (id, store_id, name, slug, price, status, created_at, updated_at) VALUES ('${productId}','${SYSTEM_STORE_ID}','Scarce Product','scarce-product','30.00','active', now(), now())`)
    await db.execute(`INSERT INTO product_variants (id, product_id, store_id, sku, label, price, stock, created_at, updated_at) VALUES ('${variantId}','${productId}','${SYSTEM_STORE_ID}','SKU-SCARCE','Default','30.00', 1, now(), now())`)

    const payload1 = { items: [{ productId, variantId, quantity: 1 }], shippingAddressId: (await db.execute(`SELECT id FROM addresses WHERE customer_id='${user1}' LIMIT 1`)).rows[0].id, paymentMethod: 'card', idempotencyKey: `s1-${Date.now()}` }
    const payload2 = { items: [{ productId, variantId, quantity: 1 }], shippingAddressId: (await db.execute(`SELECT id FROM addresses WHERE customer_id='${user2}' LIMIT 1`)).rows[0].id, paymentMethod: 'card', idempotencyKey: `s2-${Date.now()}` }

    const [r1, r2] = await Promise.allSettled([
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', 'Bearer ' + token1).send(payload1),
      request(app.getHttpServer()).post('/mobile/orders').set('Authorization', 'Bearer ' + token2).send(payload2),
    ])

    // allow tx to settle
    await new Promise((r) => setTimeout(r, 500))

    // ensure only one order created for this variant
    const rows = await db.execute(`SELECT count(*) as count FROM order_items WHERE variant_id = '${variantId}'`)
    const count = rows && rows.rows && rows.rows[0] ? Number(rows.rows[0].count) : Number(rows[0].count)
    expect(count).toBe(1)

    // check remaining stock is 0
    const sv = await db.execute(`SELECT stock FROM product_variants WHERE id = '${variantId}'`)
    const remaining = sv && sv.rows && sv.rows[0] ? Number(sv.rows[0].stock) : Number(sv[0].stock)
    expect(remaining).toBe(0)
  }, 30000)

  it('webhook replay scenario - repeated PSP webhooks are idempotent (e2e)', async () => {
    const crypto = require('crypto')
    const secret = process.env.MOCK_PAYMENT_SECRET || 'mock-secret'

    // Create an order and a payment row referencing providerPaymentId 'mock_payment_id'
    const email = `webhook+${Date.now()}@example.com`
    const pwd = 'Password123!'
    const regResp = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Webhook', lastName: 'Test', email, password: pwd })
      .expect(201)

    const accessToken = regResp.body.accessToken
    const userId = regResp.body.user.id
    const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'

    await db.execute(`INSERT INTO stores (id, name, email, country, status, created_at, updated_at) VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now()) ON CONFLICT (id) DO NOTHING`)

    const addrRow = await db.execute(`INSERT INTO addresses (customer_id, store_id, contact_name, phone, street, city, country_code, created_at, updated_at) VALUES ('${userId}', '${SYSTEM_STORE_ID}', 'Webhook', '000', 'Street W', 'Niamey', 'NE', now(), now()) RETURNING id`)
    const shippingAddressId = addrRow && addrRow.rows && addrRow.rows[0] ? addrRow.rows[0].id : addrRow[0].id

    const productId = randomUUID()
    const variantId = randomUUID()
    await db.execute(`INSERT INTO products (id, store_id, name, slug, price, status, created_at, updated_at) VALUES ('${productId}','${SYSTEM_STORE_ID}','Webhook Product','webhook-product','10.00','active', now(), now())`)
    await db.execute(`INSERT INTO product_variants (id, product_id, store_id, sku, label, price, stock, created_at, updated_at) VALUES ('${variantId}','${productId}','${SYSTEM_STORE_ID}','SKU-WEB','Default','10.00', 10, now(), now())`)

    const idempotencyKey = `webhook-${Date.now()}`
    // create order via API
    const orderResp = await request(app.getHttpServer()).post('/mobile/orders').set('Authorization', 'Bearer ' + accessToken).send({ items: [{ productId, variantId, quantity: 1 }], shippingAddressId, paymentMethod: 'card', idempotencyKey }).expect(201)
    const orderId = orderResp.body.id || orderResp.body.order?.id || orderResp.body.orderId || orderResp.body.data?.id

    // create payment row referencing this order and providerPaymentId 'mock_payment_id'
    const amount = orderResp.body.total ?? orderResp.body.order?.total ?? '10.00'
    const currency = 'XOF'
    const [payment] = await db.insert(payments).values({ orderId, storeId: SYSTEM_STORE_ID, amount: String(amount), currency, providerPaymentId: 'mock_payment_id', provider: 'mock', status: 'pending' }).returning()

    // prepare webhook payload
    const payload = { eventId: `evt_${Date.now()}`, providerPaymentId: 'mock_payment_id', status: 'captured' }
    const raw = Buffer.from(JSON.stringify(payload), 'utf8')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(raw)
    const signature = hmac.digest('hex')

    // send the same webhook twice
    const r1 = await request(app.getHttpServer()).post('/payments/webhooks/mock').set('x-webhook-signature', signature).send(payload).expect(201)
    const r2 = await request(app.getHttpServer()).post('/payments/webhooks/mock').set('x-webhook-signature', signature).send(payload).expect(201)

    // first should process, second should be ignored (order may vary)
    expect(r1.body.status === 'processed' || r1.body.status === 'ignored').toBeTruthy()
    expect(r2.body.status === 'ignored' || r2.body.status === 'processed').toBeTruthy()

    // Poll the payments row until the webhook has been applied or timeout to avoid flakes
    const maxWaitMs = 5000
    const intervalMs = 100
    let prow: any = null
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
      const pr = await db.execute(`SELECT status, webhook_event_id FROM payments WHERE id = '${payment.id}' LIMIT 1`)
      prow = pr && pr.rows && pr.rows[0] ? pr.rows[0] : pr[0]
      if (prow && prow.status === 'captured' && prow.webhook_event_id === payload.eventId) break
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    expect(prow).toBeDefined()
    expect(prow.status).toBe('captured')
    expect(prow.webhook_event_id).toBe(payload.eventId)
  }, 30000)
})
