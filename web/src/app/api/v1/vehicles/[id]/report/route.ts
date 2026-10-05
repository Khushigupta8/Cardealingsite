import { conflict, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getReview, loadVehicle } from '@/lib/server/vehicles';
import { buildReportPdf } from '@/lib/server/report';

export const maxDuration = 30;

// Branded PDF report for a completed review. The dealership that owns the car and the review team can download it.
export const GET = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req);
  const vehicle = await loadVehicle(id, user);
  const review = await getReview(vehicle.id);
  if (vehicle.status !== 'completed' || !review) throw conflict('The report is available once the review is completed');
  const bytes = await buildReportPdf(vehicle, review);
  const file = `Dealer-Review-${vehicle.year}-${vehicle.make}-${vehicle.model}-${vehicle.vin}`.replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf';
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-store',
    },
  });
});
