import { json } from '@/lib/server/http';

export function GET() {
  return json({ ok: true });
}
