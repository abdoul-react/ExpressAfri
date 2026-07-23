import axios from 'axios'

const TOKEN_KEY = 'admin_token'
const REFRESH_TOKEN_KEY = 'admin_refresh_token'
const USER_KEY = 'admin_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response && !originalRequest._retryCount) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      if (originalRequest._retryCount <= 2) {
        return api(originalRequest)
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        if (!storedRefreshToken) throw new Error('Aucun refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { timeout: 10000 },
        )

        const newToken: string = data.accessToken ?? data.token
        const newRefreshToken: string | undefined = data.refreshToken

        localStorage.setItem(TOKEN_KEY, newToken)
        if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)

        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY }
export default api
