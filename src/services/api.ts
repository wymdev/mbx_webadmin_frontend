import axios, { AxiosError } from 'axios'

export const liveMode = import.meta.env.MODE === 'live' || import.meta.env.VITE_MBX_MODE === 'live'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15_000,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})
export async function refreshCsrf() {
  const base = new URL(apiClient.defaults.baseURL || '/api/v1', window.location.origin)
  await apiClient.get(`${base.origin}/sanctum/csrf-cookie`)
}
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
