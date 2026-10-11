/**
 * http-client.ts
 * Zero-dependency fetch factory. Works in Next.js (server + client), Node 18+, and browsers.
 * Copy this single file into any project.
 */

/* ───────────────────────────── Types ───────────────────────────── */

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;
export type ApiVersion = string | number | false | null;

export interface HttpClientConfig {
  /** e.g. "http://localhost:5000" or "https://takda-api.vercel.app" */
  baseUrl: string;
  /** Default API version prefix (e.g. 'v1', 1). Default: 'v1'. Set false/null to disable. */
  version?: ApiVersion;
  /** Default headers sent on every request. */
  headers?: HeadersInit;
  /** Default timeout in ms. Set 0 to disable. Default: 15000. */
  timeoutMs?: number;
  /** Use "include" if your NestJS auth relies on cross-origin cookies. */
  credentials?: RequestCredentials;
  /** Resolve a bearer token per request (sync or async). Return null for none. */
  getToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /** Called on any 401 before the error is thrown (e.g. redirect to login, clear session). */
  onUnauthorized?: (error: ApiError) => void | Promise<void>;
  /** Inject a custom fetch (testing, instrumentation). Defaults to global fetch. */
  fetch?: typeof fetch;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  query?: QueryParams;
  body?: unknown;
  /** Target API version for this request. Overrides client default. Set false/null to disable. */
  version?: ApiVersion;
  /** Per-request timeout override. */
  timeoutMs?: number;
  /** Next.js fetch cache options (ignored outside Next). */
  next?: { revalidate?: number | false; tags?: string[] };
}

export type BodylessOptions = Omit<RequestOptions, 'body'>;

export interface HttpClient {
  request<T = unknown>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<T>;
  get<T = unknown>(path: string, options?: BodylessOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: BodylessOptions): Promise<T>;
  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<T>;
  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<T>;
  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<T>;
}

/* ───────────────────────────── Errors ───────────────────────────── */

/**
 * NestJS default error shape: { statusCode, message: string | string[], error }
 * `messages` is populated for class-validator errors (message is an array).
 * status 0 = network failure, 408 = client-side timeout.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly body: unknown;

  constructor(
    status: number,
    message: string,
    messages: string[] = [],
    body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages.length ? messages : [message];
    this.body = body;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 400 || this.status === 422;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/* ───────────────────────────── Helpers ───────────────────────────── */

function formatVersion(version?: ApiVersion): string | null {
  if (version === false || version === null || version === undefined) return null;
  const str = String(version).trim();
  if (!str) return null;
  return str.startsWith('v') ? str : `v${str}`;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: QueryParams,
  version?: ApiVersion,
): string {
  const base = baseUrl.replace(/\/+$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  const v = formatVersion(version);

  let prefix = '';
  if (v) {
    const hasVersionInBase = base.endsWith(`/${v}`);
    const hasVersionInPath = clean === `/${v}` || clean.startsWith(`/${v}/`);
    if (!hasVersionInBase && !hasVersionInPath) {
      prefix = `/${v}`;
    }
  }

  let url = `${base}${prefix}${clean}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const values = Array.isArray(value) ? value : [value];
      for (const val of values) {
        if (val !== undefined && val !== null) params.append(key, String(val));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
  );
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function toApiError(
  status: number,
  body: unknown,
  statusText: string,
): ApiError {
  let message = statusText || `Request failed (${status})`;
  let messages: string[] = [];

  if (body && typeof body === 'object') {
    const raw = (body as { message?: unknown }).message;
    if (Array.isArray(raw)) {
      messages = raw.map(String);
      message = messages[0] ?? message;
    } else if (typeof raw === 'string') {
      message = raw;
    }
  } else if (typeof body === 'string' && body) {
    message = body;
  }
  return new ApiError(status, message, messages, body);
}

/** Combines a caller's AbortSignal with a timeout. */
function withTimeout(userSignal: AbortSignal | null | undefined, ms: number) {
  const controller = new AbortController();
  let timedOut = false;

  const timer =
    ms > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, ms)
      : undefined;

  const onAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener('abort', onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      if (timer) clearTimeout(timer);
      userSignal?.removeEventListener('abort', onAbort);
    },
  };
}

/* ───────────────────────────── Factory ───────────────────────────── */

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const doFetch =
    config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const defaultVersion = config.version !== undefined ? config.version : 'v1';

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      query,
      body,
      timeoutMs,
      headers: reqHeaders,
      signal: userSignal,
      version: reqVersion,
      ...rest
    } = options;

    const effectiveVersion =
      reqVersion !== undefined ? reqVersion : defaultVersion;

    // Headers: defaults < per-request. Auth only if caller didn't set it.
    const headers = new Headers(config.headers);
    new Headers(reqHeaders).forEach((value, key) => headers.set(key, value));
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    if (!headers.has('Authorization') && config.getToken) {
      const token = await config.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    // Body: JSON by default, raw passthrough for FormData/Blob/string/etc.
    let payload: BodyInit | undefined;
    if (body !== undefined && body !== null) {
      if (isRawBody(body)) {
        payload = body;
      } else {
        payload = JSON.stringify(body);
        if (!headers.has('Content-Type'))
          headers.set('Content-Type', 'application/json');
      }
    }

    const timeout = withTimeout(
      userSignal,
      timeoutMs ?? config.timeoutMs ?? 15_000,
    );

    try {
      const res = await doFetch(
        buildUrl(config.baseUrl, path, query, effectiveVersion),
        {
          credentials: config.credentials,
          ...rest,
          method,
          headers,
          body: payload,
          signal: timeout.signal,
        },
      );

      const data = await parseBody(res);

      if (!res.ok) {
        const error = toApiError(res.status, data, res.statusText);
        if (res.status === 401) await config.onUnauthorized?.(error);
        throw error;
      }
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (timeout.didTimeout()) throw new ApiError(408, 'Request timed out');
        throw err; // caller aborted on purpose — let it propagate untouched
      }
      throw new ApiError(
        0,
        err instanceof Error ? err.message : 'Network error',
      );
    } finally {
      timeout.cleanup();
    }
  }

  return {
    request,
    get: (path, o) => request('GET', path, o),
    delete: (path, o) => request('DELETE', path, o),
    post: (path, body, o) => request('POST', path, { ...o, body }),
    put: (path, body, o) => request('PUT', path, { ...o, body }),
    patch: (path, body, o) => request('PATCH', path, { ...o, body }),
  };
}
