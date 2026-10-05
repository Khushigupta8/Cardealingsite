import type { Metadata } from 'next';
import { AccountPage } from '@/components/account/AccountPage';

export const metadata: Metadata = { title: 'Set your password' };

export default function ActivatePage() {
  return <AccountPage mode="activate" />;
}
