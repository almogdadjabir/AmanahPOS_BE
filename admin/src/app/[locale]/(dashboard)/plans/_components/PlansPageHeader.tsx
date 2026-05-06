import { Package } from 'lucide-react';
import CreatePlanButton from './CreatePlanButton';

export default function PlansPageHeader() {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0 [&_svg]:size-5">
          <Package />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage paid subscription plans available to businesses.
          </p>
        </div>
      </div>
      <div className="shrink-0 mt-0.5">
        <CreatePlanButton />
      </div>
    </div>
  );
}
