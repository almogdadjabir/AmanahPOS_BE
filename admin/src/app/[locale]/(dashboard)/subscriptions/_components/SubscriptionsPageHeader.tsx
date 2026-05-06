import { CreditCard } from 'lucide-react';
import CreateSubscriptionButton from './CreateSubscriptionButton';

export default function SubscriptionsPageHeader() {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0 [&_svg]:size-5">
          <CreditCard />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All paid subscriptions and demo access across the platform.
          </p>
        </div>
      </div>
      <div className="shrink-0 mt-0.5">
        <CreateSubscriptionButton />
      </div>
    </div>
  );
}
