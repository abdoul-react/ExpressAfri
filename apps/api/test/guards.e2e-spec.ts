import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from './../src/app.module'
import { DRIZZLE, type DrizzleDB } from '../src/database/database.module'
import { DEFAULT_TEST_PROVIDERS } from './test-mocks'

describe('Guards & Permissions (Phase E1)', () => {
  let app: INestApplication
  let db: DrizzleDB

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [...DEFAULT_TEST_PROVIDERS],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get(DRIZZLE)
  })

  afterAll(async () => {
    await app.close()
  })

  const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001'

  beforeAll(async () => {
    try {
      await db.execute(
        `INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
         VALUES ('${SYSTEM_STORE_ID}', 'System store', 'system@example.com', 'Niger', 'active', now(), now())
         ON CONFLICT (id) DO NOTHING`
      )
    } catch { /* store may already exist */ }

    try {
      await db.execute(
        `INSERT INTO admins (id, email, password_hash, first_name, last_name, role, is_super_admin, created_at, updated_at)
         VALUES ('00000000-0000-0000-0000-000000000002', 'admin@test.com', '$2a$10$dummy', 'Admin', 'Test', 'super_admin', true, now(), now())
         ON CONFLICT (email) DO NOTHING`
      )
    } catch { /* admin may already exist */ }
  })

  it('POST /auth/login with no token should succeed (public)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('GET /customers without token should be rejected (private)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/customers')
    expect([401, 404]).toContain(res.status)
  })

  it('POST /mobile/auth/register should succeed (public)', async () => {
    const email = `guard-test-${Date.now()}@example.com`
    const res = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email, password: 'Password123!' })
    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
  })

  it('GET /mobile/products should succeed (public)', async () => {
    const res = await request(app.getHttpServer())
      .get('/mobile/products')
    expect(res.status).toBe(200)
  })

  it('GET /audit without token should be rejected (admin-only)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit')
    expect([401, 404]).toContain(res.status)
  })

  it('GET /api/payments without token should be rejected (admin-only)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/payments')
    expect([401, 404]).toContain(res.status)
  })

  it('GET /api/orders without token should be rejected (admin-only)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/orders')
    expect([401, 404]).toContain(res.status)
  })

  it('POST /api/customers without token should be rejected (admin-only)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/customers')
      .send({ firstName: 'Test', email: 'test@test.com' })
    expect([401, 403]).toContain(res.status)
  })

  it('Mobile client token should be rejected on admin /api/customers route', async () => {
    const email = `mobile-guard-${Date.now()}@example.com`
    const regResp = await request(app.getHttpServer())
      .post('/mobile/auth/register')
      .send({ firstName: 'Mobile', lastName: 'User', email, password: 'Password123!' })
    expect(regResp.status).toBe(201)
    const clientToken = regResp.body.accessToken

    const res = await request(app.getHttpServer())
      .get('/api/customers')
      .set('Authorization', `Bearer ${clientToken}`)
    expect([401, 403, 404]).toContain(res.status)
  })
})
