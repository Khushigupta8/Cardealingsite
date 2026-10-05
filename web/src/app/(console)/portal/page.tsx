import type { Metadata } from 'next';
import { DealerWorkspace } from '@/components/portal/DealerWorkspace';

export const metadata: Metadata = { title: 'Dealer workspace' };

export default function PortalPage() {
  return <DealerWorkspace />;
}
