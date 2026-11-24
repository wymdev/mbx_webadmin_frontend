import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { z } from 'zod'

/**
 * HTTP layer for the Laravel /api/v1 API.
 *
 * The admin portal signs in with Sanctum's cookie session: the browser keeps the session and
 * XSRF cookies, axios echoes the XSRF token on every write. No token is ever stored in JS.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20_000,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

/** Error from the API's standard envelope: `{ message, error: { code, status, details, request_id } }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public fields: Record<string, string[]> = {},
    public requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** First message for a field, e.g. `customer.name`. */
  field(name: string) {
    return this.fields[name]?.[0]
  }
}

type ErrorBody = {
  message?: string
  error?: { code?: string; details?: Record<string, unknown>; request_id?: string }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const body = error.response?.data
    const status = error.response?.status
    const fields: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(body?.error?.details ?? {})) {
      if (Array.isArray(value)) fields[key] = value.map(String)
    }
    const message =
      body?.message ||
      (status === undefined
        ? 'Cannot reach the MBX server. Check your connection and try again.'
        : 'The request could not be completed.')
    const apiError = new ApiError(message, status, body?.error?.code, fields, body?.error?.request_id)
    const url = error.config?.url ?? ''
    if (status === 401 && !url.startsWith('auth/')) onUnauthorized?.()
    return Promise.reject(apiError)
  },
)

let onUnauthorized: (() => void) | null = null
/** Called once when any request finds the session gone (signed out elsewhere, expired). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

let csrf: Promise<void> | null = null
/** Make sure the XSRF cookie exists before a write. `force` fetches a fresh one. */
export function ensureCsrf(force = false) {
  if (force || !csrf || !document.cookie.includes('XSRF-TOKEN=')) {
    const base = new URL(apiClient.defaults.baseURL || '/api/v1', window.location.origin)
    csrf = apiClient
      .get(`${base.origin}/sanctum/csrf-cookie`)
      .then(() => undefined)
      .catch((error: unknown) => {
        csrf = null
        throw error
      })
  }
  return csrf
}
/** @deprecated use `send`, which handles CSRF itself. */
export const refreshCsrf = () => ensureCsrf(true)

const envelope = <S extends z.ZodType>(data: S) => z.object({ data })

function parse<S extends z.ZodType>(schema: S, body: unknown, path: string): z.infer<S> {
  const result = envelope(schema).safeParse(body)
  if (!result.success) {
    console.error(`Unexpected response from ${path}`, result.error.issues)
    throw new ApiError('The server sent an unexpected response. Please reload and try again.')
  }
  return (result.data as { data: z.infer<S> }).data
}

type ReadOptions = { params?: Record<string, unknown>; signal?: AbortSignal }

/** GET a single resource and validate `data` against the schema. */
export async function get<S extends z.ZodType>(path: string, schema: S, options: ReadOptions = {}) {
  const { data } = await apiClient.get(path, options)
  return parse(schema, data, path)
}

export const pagination = z.object({
  type: z.enum(['page', 'cursor']),
  per_page: z.number(),
  has_more: z.boolean(),
  current_page: z.number().optional(),
  last_page: z.number().optional(),
  total: z.number().optional(),
  from: z.number().nullish(),
  to: z.number().nullish(),
  next_cursor: z.string().nullish(),
})
export type Pagination = z.infer<typeof pagination>

/** GET a paginated list. */
export async function getPage<S extends z.ZodType>(path: string, item: S, options: ReadOptions = {}) {
  const { data } = await apiClient.get(path, options)
  const result = z.object({ data: z.array(item), meta: z.object({ pagination }) }).safeParse(data)
  if (!result.success) {
    console.error(`Unexpected response from ${path}`, result.error.issues)
    throw new ApiError('The server sent an unexpected response. Please reload and try again.')
  }
  return { rows: result.data.data as z.infer<S>[], pagination: result.data.meta.pagination }
}

/** A write (POST/PUT/PATCH/DELETE). Fetches the CSRF cookie and retries once if the session token expired. */
export async function send<T = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body?: unknown,
  config: AxiosRequestConfig = {},
): Promise<{ data: T; message?: string }> {
  await ensureCsrf()
  const request = () =>
    apiClient.request<{ data: T; message?: string }>({ method, url: path, data: body, ...config })
  try {
    return (await request()).data
  } catch (error) {
    if (error instanceof ApiError && error.status === 419) {
      await ensureCsrf(true)
      return (await request()).data
    }
    throw error
  }
}

/** Download a file response (CSV export) with the given name. */
export async function download(path: string, filename: string, params?: Record<string, unknown>) {
  const response = await apiClient.get<Blob>(path, { params, responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.') {
  return error instanceof Error ? error.message : fallback
}
