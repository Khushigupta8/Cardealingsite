// Browser client for the Dealer Review API. Any other frontend can talk to /api/v1 the same way.

export type Role = 'dealer' | 'reviewer' | 'admin';
export type Status = 'pending' | 'needs_info' | 'completed';

export interface Me {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  activatedAt: string | null;
  dealership: { id: string; name: string } | null;
}

export interface Review {
  conditionGrade: number;
  recommendedPrice: number;
  notes?: string | null;
  gradedAt?: string;
}

export interface Vehicle {
  id: string;
  dealershipId: string;
  dealershipName: string | null;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  conditionNotes: string | null;
  askingPrice: number | null;
  status: Status;
  infoRequest: string | null;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
  review: Review | null;
  unread?: number; // messages from the other side not yet read
}

export interface Photo { id: string; url: string | null; createdAt: string }
export interface VehicleDetail extends Vehicle { photos: Photo[] }
export interface VehicleList { items: Vehicle[]; total: number; counts: Record<Status, number> }

export interface Person {
  id: string;
  email: string | null;
  role: Role;
  fullName: string | null;
  dealership: { id: string; name: string } | null;
  activatedAt: string | null;
  disabledAt: string | null;
  termsAcceptedAt?: string | null;
  invitedAt: string;
}
export interface Dealership { id: string; name: string; createdAt: string }

export interface Unread { vehicleId: string; vehicleName: string; dealershipName: string | null; count: number; lastBody: string; lastAt: string }
export interface Notifications { items: Unread[]; total: number }

export interface Message { id: string; authorRole: Role; authorName: string | null; body: string; createdAt: string }

export type EnquiryStatus = 'new' | 'contacted' | 'invited' | 'closed';
export interface Enquiry {
  id: string;
  name: string;
  dealership: string;
  email: string;
  phone: string | null;
  location: string | null;
  monthlyVolume: string | null;
  message: string | null;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  required: boolean;
  exempt: boolean;
  status: string | null;
  active: boolean;
  inGrace: boolean;
  graceEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: { amountCents: number; interval: 'month' | 'year' } | null;
  hasSubscription: boolean;
  hasCustomer: boolean;
  billingAvailable?: boolean;
}
export interface DealershipMembership extends Membership { id: string; name: string }
export interface AdminSettings { membershipRequired: boolean; graceDays: number; stripeConfigured: boolean; webhookConfigured: boolean }

export interface VinResult { vin: string; year: number; make: string; model: string | null; trim: string | null; warning: string | null }

interface Session { accessToken: string; refreshToken: string; expiresAt: number | null }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { fieldErrors?: Record<string, string[]> }) {
    super(message);
  }
  // The most specific message: the first field error if there is one.
  get friendly() {
    const field = this.details?.fieldErrors && Object.values(this.details.fieldErrors).flat()[0];
    return field || this.message;
  }
}

const BASE = '/api/v1';
const KEY = 'dr.session';

const load = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
};
const save = (s: Session | null) => {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch {}
};

let session: Session | null = typeof window === 'undefined' ? null : load();

type Opts = { body?: unknown; auth?: boolean };

async function send(method: string, path: string, { body, auth = true }: Opts) {
  const headers: Record<string, string> = {};
  if (auth && session) headers.Authorization = `Bearer ${session.accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }
}

let refreshing: Promise<boolean> | null = null;
function refresh() {
  // One refresh at a time, shared by every request that hit an expired token.
  refreshing ??= (async () => {
    const res = await send('POST', '/auth/refresh', { body: { refreshToken: session!.refreshToken }, auth: false });
    // Only a definite "invalid" forgets the session; rate limits or outages keep it for the next try.
    if (res.status === 401) { save((session = null)); return false; }
    if (!res.ok) return false;
    save((session = await res.json()));
    return true;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function request<T>(method: string, path: string, opts: Opts = {}): Promise<T> {
  let res = await send(method, path, opts);
  if (res.status === 401 && opts.auth !== false && session?.refreshToken && (await refresh())) {
    res = await send(method, path, opts);
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const e: { code?: string; message?: string; details?: ApiError['details'] } = (data as { error?: object } | null)?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'error', e.message ?? `Request failed (${res.status})`, e.details);
  }
  return data as T;
}

export const api = {
  isSignedIn: () => !!session,
  get: <T>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T = unknown>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  del: <T = null>(path: string) => request<T>('DELETE', path),
  async login(email: string, password: string) {
    session = await request<Session>('POST', '/auth/login', { body: { email, password }, auth: false });
    save(session);
    return request<Me>('GET', '/auth/me');
  },
  me: () => request<Me>('GET', '/auth/me'),
  // Tokens from an invitation or reset link (URL fragment) become the session.
  setSession(tokens: Session) { save((session = tokens)); },
  requestPasswordReset: (email: string) => request<null>('POST', '/auth/password-reset', { body: { email }, auth: false }),
  // Drop the session in this browser only (no server call), e.g. after the server said it is invalid.
  forget() { save((session = null)); },
  async logout() {
    try { if (session) await request('POST', '/auth/logout'); } catch {}
    save((session = null));
  },
  // Download a completed vehicle's branded PDF report (needs the sign-in token, so it can't be a plain link).
  async downloadReport(vehicleId: string) {
    let res = await send('GET', `/vehicles/${encodeURIComponent(vehicleId)}/report`, {});
    if (res.status === 401 && session?.refreshToken && (await refresh())) res = await send('GET', `/vehicles/${encodeURIComponent(vehicleId)}/report`, {});
    if (!res.ok) {
      const e = (await res.json().catch(() => null))?.error ?? {};
      throw new ApiError(res.status, e.code ?? 'error', e.message ?? 'Could not create the report.');
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'Dealer-Review-report.pdf';
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return name;
  },
  // Public: the homepage's "Request an invitation" form.
  submitEnquiry: (body: Record<string, string>) => request<{ ok: true }>('POST', '/enquiries', { body, auth: false }),
  // Photos go straight to Supabase Storage via one-time URLs, then get recorded on the vehicle.
  async uploadPhotos(vehicleId: string, files: File[], onEach?: (index: number) => void) {
    const id = encodeURIComponent(vehicleId);
    for (let i = 0; i < files.length; i += 10) {
      const batch = files.slice(i, i + 10);
      const { uploads, headers } = await request<{ uploads: { path: string; url: string; contentType: string }[]; headers: Record<string, string> }>(
        'POST', `/vehicles/${id}/photos/uploads`, { body: { files: batch.map(f => ({ contentType: f.type, size: f.size })) } },
      );
      const results = await Promise.all(
        uploads.map(async (u, j) => {
          const form = new FormData();
          form.append('cacheControl', '3600');
          form.append('', batch[j], batch[j].name);
          const res = await fetch(u.url, { method: 'PUT', headers: { ...headers, 'x-upsert': 'false' }, body: form }).catch(() => null);
          if (res?.ok) onEach?.(i + j);
          return res?.ok ? u.path : null;
        }),
      );
      // Attach whatever made it, then report the rest so the dealer can retry just those.
      const done = results.filter((p): p is string => !!p);
      if (done.length) await request('POST', `/vehicles/${id}/photos`, { body: { paths: done } });
      const failed = batch.filter((_, j) => !results[j]);
      if (failed.length) {
        throw new ApiError(0, 'upload', `${failed.length === 1 ? failed[0].name : `${failed.length} photos`} did not upload. Add ${failed.length === 1 ? 'it' : 'them'} again.`);
      }
    }
  },
};
