/**
 * validated-client.ts
 * Zod-validated layer on top of http-client.ts. Compatible with Zod 3 and 4.
 *
 * Every call takes a schema, and the return type is inferred from it:
 *   const queue = await api.get('/queues/1', QueueSchema); // typed as z.infer<typeof QueueSchema>
 */
import type { z, ZodError, ZodType } from 'zod';
import {
  createHttpClient,
  type BodylessOptions,
  type HttpClient,
  type HttpClientConfig,
  type RequestOptions,
} from './http-client';

/* ───────────────────────────── Errors ───────────────────────────── */

/**
 * Thrown when the server responded 2xx but the payload doesn't match the schema.
 * This is a contract problem (backend/frontend drift), not a user error.
 * It is deliberately NOT an ApiError so UI code can tell the two apart.
 */
export class ResponseValidationError extends Error {
  readonly method: string;
  readonly path: string;
  readonly zodError: ZodError;
  /** Raw payload that failed validation. Be careful logging this if it may contain PII. */
  readonly body: unknown;

  constructor(method: string, path: string, zodError: ZodError, body: unknown) {
    const summary = zodError.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    super(`Invalid response from ${method} ${path} — ${summary}`);
    this.name = 'ResponseValidationError';
    this.method = method;
    this.path = path;
    this.zodError = zodError;
    this.body = body;
  }

  get issues() {
    return this.zodError.issues;
  }
}

export const isResponseValidationError = (
  e: unknown,
): e is ResponseValidationError => e instanceof ResponseValidationError;

/* ───────────────────────────── Types ───────────────────────────── */

export interface ValidatedClient {
  /** Escape hatch to the underlying unvalidated client (e.g. file downloads). */
  raw: HttpClient;
  request<S extends ZodType>(
    method: string,
    path: string,
    schema: S,
    options?: RequestOptions,
  ): Promise<z.infer<S>>;
  get<S extends ZodType>(
    path: string,
    schema: S,
    options?: BodylessOptions,
  ): Promise<z.infer<S>>;
  delete<S extends ZodType>(
    path: string,
    schema: S,
    options?: BodylessOptions,
  ): Promise<z.infer<S>>;
  post<S extends ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<z.infer<S>>;
  put<S extends ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<z.infer<S>>;
  patch<S extends ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: BodylessOptions,
  ): Promise<z.infer<S>>;
}

export interface ValidationOptions {
  /** Report contract drift (Sentry, console, etc.). The error is still thrown afterwards. */
  onValidationError?: (error: ResponseValidationError) => void;
}

/* ───────────────────────────── Factory ───────────────────────────── */

/** Wrap an existing client. */
export function withSchemas(
  client: HttpClient,
  opts: ValidationOptions = {},
): ValidatedClient {
  async function request<S extends ZodType>(
    method: string,
    path: string,
    schema: S,
    options?: RequestOptions,
  ): Promise<z.infer<S>> {
    const data = await client.request<unknown>(method, path, options);
    const result = schema.safeParse(data);

    if (!result.success) {
      const error = new ResponseValidationError(
        method,
        path,
        result.error as ZodError,
        data,
      );
      opts.onValidationError?.(error);
      throw error;
    }
    return result.data as z.infer<S>;
  }

  return {
    raw: client,
    request,
    get: (path, schema, o) => request('GET', path, schema, o),
    delete: (path, schema, o) => request('DELETE', path, schema, o),
    post: (path, schema, body, o) =>
      request('POST', path, schema, { ...o, body }),
    put: (path, schema, body, o) =>
      request('PUT', path, schema, { ...o, body }),
    patch: (path, schema, body, o) =>
      request('PATCH', path, schema, { ...o, body }),
  };
}

/** Convenience: build the base client and wrap it in one call. */
export function createValidatedClient(
  config: HttpClientConfig,
  opts?: ValidationOptions,
): ValidatedClient {
  return withSchemas(createHttpClient(config), opts);
}
