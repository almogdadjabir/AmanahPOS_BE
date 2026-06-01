import { AlertTriangle, XCircle, FlaskConical, PhoneCall } from 'lucide-react';
import type { SubscriptionStatus } from '@/lib/subscription-utils';

interface AlertProps {
  status:         SubscriptionStatus;
  daysRemaining?: number;
  planName?:      string;
}

export default function SubscriptionAlerts({ status, daysRemaining, planName }: AlertProps) {
  if (status === 'active') return null;

  if (status === 'expiring_soon') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-light px-4 py-3.5 mb-4">
        <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-warning">
            Subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </p>
          <p className="text-[12px] text-warning/80 mt-0.5">
            Contact your platform administrator to renew before your access is interrupted.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-light px-4 py-3.5 mb-4">
        <XCircle size={15} className="text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-danger">Subscription expired</p>
          <p className="text-[12px] text-danger/80 mt-0.5">
            Your <strong>{planName}</strong> plan has expired. Contact your platform administrator to renew.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'inactive') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-light px-4 py-3.5 mb-4">
        <XCircle size={15} className="text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-danger">Subscription inactive</p>
          <p className="text-[12px] text-danger/80 mt-0.5">
            Your subscription has been deactivated. Contact your platform administrator to restore access.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'demo') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-light px-4 py-3.5 mb-4">
        <FlaskConical size={15} className="text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-warning">Demo access — not a paid plan</p>
          <p className="text-[12px] text-warning/80 mt-0.5">
            You are on a demo account with limited access. Contact your platform administrator to activate a paid plan.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'none') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 mb-4">
        <PhoneCall size={15} className="text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">No active subscription</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Contact your platform administrator to activate a subscription plan.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
