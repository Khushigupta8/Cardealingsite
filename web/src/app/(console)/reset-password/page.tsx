import type { Metadata } from 'next';
import { AccountPage } from '@/components/account/AccountPage';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ResetPasswordPage() {
  return <AccountPage mode="reset" />;
}
