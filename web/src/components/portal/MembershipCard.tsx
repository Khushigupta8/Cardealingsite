'use client';

import { useState } from 'react';
import { api, type Membership } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { useToast } from '@/components/console/kit';
import { date } from '@/components/console/format';

export const planLabel = (p: Membership['plan']) =>
  p ? `$${(p.amountCents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} / ${p.interval === 'month' ? 'month' : 'year'}` : '';

// Membership status for the dealership, with the next step (activate, update payment, manage).
// Hidden while membership isn't required.
export function MembershipCard({ m, errorText }: { m: Membership; errorText: (e: unknown) => string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<'' | 'checkout' | 'portal'>('');

  const go = async (kind: 'checkout' | 'portal') => {
    setBusy(kind);
    try {
      const { url } = await api.post<{ url: string }>(`/billing/${kind}`);
      window.location.assign(url);
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
      setBusy('');
    }
  };
  const manage = (label = 'Manage billing') => (
    <button className="btn" id="manage-billing" disabled={!!busy} onClick={() => go('portal')}>
      {busy === 'portal' ? 'Opening…' : label}
    </button>
  );

  if (!m.required) return null;

  if (m.exempt) {
    return (
      <div className="membership-card ok" id="membership-card">
        <div><strong><Icon name="check" />Complimentary membership</strong><p>Your dealership has full access at no charge.</p></div>
      </div>
    );
  }

  // Active (or cancelling at period end).
  if (m.active && !m.inGrace) {
    return (
      <div className="membership-card ok" id="membership-card">
        <div>
          <strong><Icon name="check" />Membership active{m.plan ? ` · ${planLabel(m.plan)}` : ''}</strong>
          <p>{m.cancelAtPeriodEnd ? `Cancelled. Access continues until ${date(m.currentPeriodEnd)}.` : m.currentPeriodEnd ? `Renews ${date(m.currentPeriodEnd)}.` : 'Renews automatically.'}</p>
        </div>
        {m.hasCustomer && manage(m.cancelAtPeriodEnd ? 'Resume or manage' : 'Manage billing')}
      </div>
    );
  }

  // Payment failed, still inside the grace period.
  if (m.inGrace) {
    return (
      <div className="membership-card warn" id="membership-card">
        <div>
          <strong><Icon name="alert" />Payment failed</strong>
          <p>Update your payment details by {date(m.graceEndsAt)} to keep submitting vehicles.</p>
        </div>
        {manage('Update payment')}
      </div>
    );
  }

  // Not active: never subscribed, or lapsed.
  const lapsed = m.hasSubscription || (m.status && m.status !== 'incomplete');
  return (
    <div className="membership-card late" id="membership-card">
      <div>
        <strong><Icon name="alert" />{lapsed ? 'Your membership has paused' : 'Activate your membership'}</strong>
        <p>
          {!m.plan
            ? 'Your reviewer is setting up your membership plan. You can browse your workspace in the meantime.'
            : lapsed
              ? 'Submitting and updating vehicles is paused. Your vehicles and reports stay available.'
              : `Start your ${planLabel(m.plan)} membership to submit vehicles. Pay by card or bank account (ACH).`}
        </p>
      </div>
      {m.plan && m.billingAvailable !== false && (
        <div className="membership-actions">
          {m.hasSubscription && m.hasCustomer ? (
            manage('Update payment')
          ) : (
            <button className="btn btn-primary" id="activate-membership" disabled={!!busy} onClick={() => go('checkout')}>
              {busy === 'checkout' ? 'Opening checkout…' : `Activate · ${planLabel(m.plan)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
