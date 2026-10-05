import { json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { unreadFor } from '@/lib/server/messages';

// Conversations with messages this user's side hasn't read yet (the bell in the header).
export const GET = route(async req => {
  const user = await requireUser(req);
  const items = await unreadFor(user);
  return json({ items, total: items.reduce((n, u) => n + u.count, 0) });
});
