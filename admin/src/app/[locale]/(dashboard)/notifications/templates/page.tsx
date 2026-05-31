import { getTranslations } from 'next-intl/server';
import { LayoutTemplate } from 'lucide-react';
import TemplatesList from './_components/TemplatesList';

export default async function TemplatesPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
          <LayoutTemplate />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('templates.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('templates.description')}
          </p>
        </div>
      </div>
      <TemplatesList />
    </div>
  );
}
