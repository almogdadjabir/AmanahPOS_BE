import { Store } from 'lucide-react';
import CreateBusinessButton from './CreateBusinessButton';

export default function BusinessesPageHeader() {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0 [&_svg]:size-5">
          <Store />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            Businesses
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All businesses registered on the platform.
          </p>
        </div>
      </div>
      <div className="shrink-0 mt-0.5">
        <CreateBusinessButton />
      </div>
    </div>
  );
}
