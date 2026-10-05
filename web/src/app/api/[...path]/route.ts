import { json } from '@/lib/server/http';

// Unknown API paths answer in the API's JSON error format instead of an HTML 404 page.
const notFound = () => json({ error: { code: 'not_found', message: 'No such endpoint' } }, 404);
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
