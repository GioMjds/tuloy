export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

// Nest returns { statusCode, message, error }; message may be string | string[]
export const parseErrorCode = (body: unknown): string => {
  const m = (body as { message?: unknown } | null)?.message;
  return typeof m === 'string' ? m : 'request_failed';
};
