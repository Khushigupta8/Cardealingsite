import 'server-only';
import { after } from 'next/server';
import { admin } from './supabase';
import { must } from './http';
import { emailsFor, sendEmail } from './email';
import type { AuthUser } from './auth';
import type { VehicleRow } from './vehicles';

export const toMessage = (m: Record<string, unknown>) => ({
  id: m.id as string,
  authorRole: m.author_role as 'dealer' | 'reviewer' | 'admin',
  authorName: (m.author as { full_name: string | null } | null)?.full_name ?? null,
  body: m.body as string,
  createdAt: m.created_at as string,
});

export async function listMessages(vehicleId: string) {
  const rows = must(
    await admin()
      .from('vehicle_messages')
      .select('id, author_role, body, created_at, author:profiles(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('created_at'),
  );
  return rows.map(toMessage);
}

const name = (v: VehicleRow) => `${v.year} ${v.make} ${v.model}`;

// Thread entries written as a side effect of another action (asking for info, resubmitting).
// The action has already succeeded, so a failure here is logged rather than reported.
export async function addMessageQuietly(...args: Parameters<typeof addMessage>) {
  try {
    await addMessage(...args);
  } catch (err) {
    console.error(`[messages] could not add thread entry: ${(err as Error).message}`);
  }
}

// Add a message to a vehicle's thread. Messages from the review team email the dealership.
export async function addMessage(vehicle: VehicleRow, user: AuthUser, body: string, { notify = true } = {}) {
  const row = must(
    await admin()
      .from('vehicle_messages')
      .insert({ vehicle_id: vehicle.id, author_id: user.id, author_role: user.role, body })
      .select('id, author_role, body, created_at, author:profiles(full_name)')
      .single(),
  );
  // Writing in a thread means you've read it.
  await markRead(vehicle.id, user);
  if (notify && user.role !== 'dealer') {
    after(async () =>
      sendEmail({
        to: await emailsFor({ role: 'dealer', dealershipId: vehicle.dealership_id }),
        subject: `A note from your reviewer: ${name(vehicle)}`,
        heading: `Your reviewer wrote about the ${name(vehicle)}`,
        lines: [`“${body}”`],
        cta: { label: 'Open your workspace', path: '/portal' },
      }),
    );
  }
  if (notify && user.role === 'dealer') {
    after(async () => {
      const team = [...(await emailsFor({ role: 'reviewer' })), ...(await emailsFor({ role: 'admin' }))];
      const dealership = vehicle.dealership?.name ?? 'A dealership';
      await sendEmail({
        to: team,
        subject: `New message from ${dealership}: ${name(vehicle)}`,
        heading: `${dealership} wrote about the ${name(vehicle)}`,
        lines: [`“${body}”`],
        cta: { label: 'Open the review queue', path: '/admin' },
      });
    });
  }
  return toMessage(row);
}

// ---------- Unread messages ----------
// Read state is kept per side: the dealership, and the review team (reviewers and admins share it).
type Side = 'dealer' | 'team';
const sideOf = (user: AuthUser): Side => (user.role === 'dealer' ? 'dealer' : 'team');

// Needs migration 006; without it nothing is ever unread, so the app still works.
export async function markRead(vehicleId: string, user: AuthUser) {
  const { error } = await admin()
    .from('message_reads')
    .upsert({ vehicle_id: vehicleId, side: sideOf(user), read_at: new Date().toISOString() });
  if (error) console.warn(`[messages] could not mark read (has migration 006 been run?): ${error.message}`);
}

export type Unread = {
  vehicleId: string;
  vehicleName: string;
  dealershipName: string | null;
  count: number;
  lastBody: string;
  lastAt: string;
};

// Conversations with messages from the other side that this user's side hasn't read yet,
// newest first. Optionally limited to some vehicles (for list badges).
export async function unreadFor(user: AuthUser, vehicleIds?: string[]): Promise<Unread[]> {
  if (vehicleIds && !vehicleIds.length) return [];
  const side = sideOf(user);
  const db = admin();
  let q = db
    .from('vehicle_messages')
    .select('vehicle_id, body, created_at, vehicle:vehicles!inner(id, year, make, model, dealership_id, dealership:dealerships(name))')
    .gte('created_at', new Date(Date.now() - 90 * 864e5).toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);
  q = side === 'dealer' ? q.neq('author_role', 'dealer').eq('vehicle.dealership_id', user.dealershipId ?? '') : q.eq('author_role', 'dealer');
  if (vehicleIds) q = q.in('vehicle_id', vehicleIds);
  const { data: messages, error } = await q;
  if (error) {
    console.warn(`[messages] could not count unread: ${error.message}`);
    return [];
  }
  if (!messages?.length) return [];

  const ids = [...new Set(messages.map(m => m.vehicle_id as string))];
  const { data: reads, error: readsError } = await db.from('message_reads').select('vehicle_id, read_at').eq('side', side).in('vehicle_id', ids);
  if (readsError) return []; // migration 006 not run yet
  const readAt = new Map((reads ?? []).map(r => [r.vehicle_id as string, r.read_at as string]));

  const byVehicle = new Map<string, Unread>();
  for (const m of messages) {
    const id = m.vehicle_id as string;
    const seen = readAt.get(id);
    if (seen && (m.created_at as string) <= seen) continue;
    const v = m.vehicle as unknown as { year: number; make: string; model: string; dealership: { name: string } | null };
    const entry = byVehicle.get(id);
    if (entry) entry.count++;
    else {
      byVehicle.set(id, {
        vehicleId: id,
        vehicleName: `${v.year} ${v.make} ${v.model}`,
        dealershipName: v.dealership?.name ?? null,
        count: 1,
        lastBody: m.body as string,
        lastAt: m.created_at as string,
      });
    }
  }
  return [...byVehicle.values()];
}
