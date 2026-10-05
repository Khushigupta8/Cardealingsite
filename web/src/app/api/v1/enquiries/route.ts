import { after } from 'next/server';
import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { json, must, readJson, route } from '@/lib/server/http';
import { rateLimit } from '@/lib/server/rate-limit';
import { emailsFor, sendEmail } from '@/lib/server/email';

const optional = (max: number) => z.string().trim().max(max).optional().transform(v => v || null);

const enquiry = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  dealership: z.string().trim().min(1, 'Enter your dealership').max(160),
  email: z.email('Enter a valid email address').max(200),
  phone: optional(40),
  location: optional(120),
  monthlyVolume: optional(40),
  message: optional(2000),
  // Honeypot: hidden from people, filled by bots.
  website: z.string().max(0).optional(),
});

// Public "Request an invitation" form on the homepage.
export const POST = route(async req => {
  await rateLimit(req, 'enquiry', 5, 60 * 60);
  const raw = await readJson(req);
  // Quietly accept bot submissions without storing them.
  if ((raw as { website?: string })?.website) return json({ ok: true }, 201);
  const e = enquiry.parse(raw);
  must(
    await admin().from('enquiries').insert({
      name: e.name,
      dealership: e.dealership,
      email: e.email.toLowerCase(),
      phone: e.phone,
      location: e.location,
      monthly_volume: e.monthlyVolume,
      message: e.message,
    }),
  );
  after(async () =>
    sendEmail({
      to: await emailsFor({ role: 'admin' }),
      subject: `New enquiry: ${e.dealership}`,
      preheader: `${e.name} from ${e.dealership} asked for an invitation`,
      eyebrow: 'New enquiry',
      title: ['Invitation', 'requested.'],
      blocks: [
        { kind: 'text', text: 'A dealership asked for an invitation from the website.' },
        {
          kind: 'details',
          rows: [
            ['Dealership', e.dealership],
            ['Contact', e.name],
            ['Email', e.email],
            ...(e.phone ? ([['Phone', e.phone]] as [string, string][]) : []),
            ...(e.location ? ([['Location', e.location]] as [string, string][]) : []),
            ...(e.monthlyVolume ? ([['Vehicles per month', e.monthlyVolume]] as [string, string][]) : []),
          ],
        },
        ...(e.message ? [{ kind: 'quote' as const, from: 'Their message', text: e.message }] : []),
      ],
      cta: { label: 'Open enquiries', path: '/admin#enquiries' },
    }),
  );
  return json({ ok: true }, 201);
});
