import { Injectable } from '@nestjs/common'

@Injectable()
export class MetricsService {
  private totalRequests = 0
  private error5xx = 0
  private responseTimes: number[] = []

  recordRequest(statusCode: number, durationMs: number) {
    this.totalRequests++
    if (statusCode >= 500) this.error5xx++
    this.responseTimes.push(durationMs)
    if (this.responseTimes.length > 1000) this.responseTimes.shift()
  }

  getMetrics() {
    const times = this.responseTimes
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    const sorted = [...times].sort((a, b) => a - b)
    return {
      totalRequests: this.totalRequests,
      error5xx: this.error5xx,
      errorRate: this.totalRequests ? (this.error5xx / this.totalRequests * 100).toFixed(2) + '%' : '0%',
      responseTimeMs: {
        avg: Math.round(avg),
        p50: sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0,
        p95: sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0,
        p99: sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0,
      },
    }
  }

  reset() {
    this.totalRequests = 0
    this.error5xx = 0
    this.responseTimes = []
  }
}
