import 'server-only';
import { ZodError, z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg, 'bad_request');
export const unauthorized = (msg = 'Sign in required') => new HttpError(401, msg, 'unauthorized');
export const forbidden = (msg = 'Not allowed') => new HttpError(403, msg, 'forbidden');
export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'not_found');
export const conflict = (msg: string) => new HttpError(409, msg, 'conflict');
export const tooMany = (msg = 'Too many attempts. Please wait a few minutes and try again.') => new HttpError(429, msg, 'rate_limited');

type DbResult = { data: unknown; error: { message: string } | null };

// Unwrap a Supabase query result, turning database errors into 500s.
export function must<R extends DbResult>(result: R): NonNullable<R['data']> {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data as NonNullable<R['data']>;
}

// Same, for .maybeSingle() queries where no row is a valid answer.
export function maybe<R extends DbResult>(result: R): R['data'] | null {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data ?? null;
}

const MAX_JSON = 100 * 1024;

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_JSON) throw new HttpError(413, 'Request body too large', 'too_large');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('Body must be JSON');
  }
}

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const noContent = () => new Response(null, { status: 204 });

// Every error leaves the API as { error: { code, message, details? } }.
export function toErrorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return json({ error: { code: 'validation', message: 'Invalid input', details: z.flattenError(err) } }, 400);
  }
  if (err instanceof HttpError) return json({ error: { code: err.code, message: err.message } }, err.status);
  console.error(err);
  return json({ error: { code: 'internal', message: 'Something went wrong' } }, 500);
}

type Ctx<P> = { params: Promise<P> };

// Wrap a route handler so thrown errors become JSON responses.
export function route<P = Record<string, string>>(fn: (req: Request, params: P) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      return await fn(req, await ctx.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export const uuid = (id: string, what = 'Not found') => {
  if (!z.uuid().safeParse(id).success) throw notFound(what);
  return id;
};
