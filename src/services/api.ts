import axios, { AxiosError } from 'axios'

// Integration boundary only. Demo services never call this client.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    return Promise.reject(
      new ApiError(
        error.response?.data?.message || 'The request could not be completed.',
        error.response?.status,
      ),
    )
  },
)
