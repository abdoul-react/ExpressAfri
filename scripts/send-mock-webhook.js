// Usage: node scripts/send-mock-webhook.js [port]
// Sets MOCK_PAYMENT_SECRET env or defaults to 'mock-secret'
// Sends signed webhook to http://localhost:<port>/payments/webhooks/mock

const crypto = require('crypto')
const http = require('http')

const port = process.argv[2] || process.env.PORT || 3000
const secret = process.env.MOCK_PAYMENT_SECRET || 'mock-secret'

const payload = {
  eventId: `evt_${Date.now()}`,
  providerPaymentId: 'mock_payment_id',
  status: 'captured',
}

const raw = Buffer.from(JSON.stringify(payload), 'utf8')
const hmac = crypto.createHmac('sha256', secret)
hmac.update(raw)
const signature = hmac.digest('hex')

const options = {
  hostname: 'localhost',
  port: port,
  path: '/payments/webhooks/mock',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': raw.length,
    'x-webhook-signature': signature,
  },
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => (data += chunk))
  res.on('end', () => {
    console.log('Response status:', res.statusCode)
    console.log('Response body:', data)
  })
})

req.on('error', (err) => {
  console.error('Request error:', err.message)
})

req.write(raw)
req.end()
