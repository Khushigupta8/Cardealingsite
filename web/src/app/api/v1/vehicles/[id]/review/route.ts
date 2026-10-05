import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { conflict, json, maybe, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { after } from 'next/server';
import { VEHICLE_COLUMNS, asRow, getReview, loadVehicle, toVehicle } from '@/lib/server/vehicles';
import { emailsFor, sendEmail } from '@/lib/server/email';

// Reviewer grades the vehicle; this completes it.
const GRADE_WORDS: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Rough', 1: 'Poor' };

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'reviewer', 'admin');
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status !== 'pending') throw conflict('Only pending vehicles can be reviewed');
  const body = z
    .object({
      conditionGrade: z.coerce.number().int().min(1).max(5),
      recommendedPrice: z.coerce.number().min(0).max(100_000_000),
      notes: z.string().trim().max(5000).nullish(),
    })
    .parse(await readJson(req));

  const db = admin();
  // Complete the car only if it is still pending, so two reviewers (or a review racing an
  // info request) can't both act on it. Then save the grade; undo the completion if that fails.
  const row = maybe(
    await db
      .from('vehicles')
      .update({ status: 'completed', info_request: null, completed_at: new Date().toISOString() })
      .eq('id', vehicle.id)
      .eq('status', 'pending')
      .select(VEHICLE_COLUMNS)
      .maybeSingle(),
  );
  if (!row) throw conflict('This vehicle changed while you were reviewing it. Refresh to see its current status.');
  const saved = await db.from('reviews').upsert({
    vehicle_id: vehicle.id,
    reviewer_id: user.id,
    condition_grade: body.conditionGrade,
    recommended_price: body.recommendedPrice,
    notes: body.notes || null,
    graded_at: new Date().toISOString(),
  });
  if (saved.error) {
    await db.from('vehicles').update({ status: 'pending', completed_at: null }).eq('id', vehicle.id);
    throw new Error(`Could not save the review: ${saved.error.message}`);
  }
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  after(async () =>
    sendEmail({
      to: await emailsFor({ role: 'dealer', dealershipId: vehicle.dealership_id }),
      subject: `Your review is ready: ${name}`,
      preheader: `Grade ${body.conditionGrade}/5 · recommended $${body.recommendedPrice.toLocaleString('en-US')}`,
      eyebrow: 'Review complete',
      title: ['Your review', 'is ready.'],
      blocks: [
        { kind: 'text', text: `Our team has finished reviewing the ${name}${vehicle.trim ? ` ${vehicle.trim}` : ''} (VIN ${vehicle.vin}).` },
        {
          kind: 'stats',
          items: [
            { label: 'Condition grade', value: `${body.conditionGrade}/5`, sub: GRADE_WORDS[body.conditionGrade] },
            { label: 'Recommended listing', value: `$${body.recommendedPrice.toLocaleString('en-US')}` },
          ],
        },
        ...(body.notes ? [{ kind: 'quote' as const, from: 'Reviewer notes', text: body.notes }] : []),
        { kind: 'text', text: 'Open the vehicle in your workspace to download the branded PDF report.' },
      ],
      cta: { label: 'View the review', path: '/portal' },
    }),
  );
  return json({ ...toVehicle(asRow(row)), review: await getReview(vehicle.id) });
});
