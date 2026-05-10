import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import CreateOwnerButton from "./CreateOwnerButton";

export default async function OwnersPageHeader() {
  const t = await getTranslations('owners');
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
          <Users />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('description')}
          </p>
        </div>
      </div>
      <div className="shrink-0 mt-0.5">
        <CreateOwnerButton />
      </div>
    </div>
  );
}
