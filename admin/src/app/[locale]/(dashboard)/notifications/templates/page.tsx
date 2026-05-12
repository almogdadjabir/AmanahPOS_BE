import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import TemplatesList from './_components/TemplatesList';

export default async function TemplatesPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <Link
          href="/notifications/templates/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          {t('newTemplate')}
        </Link>
      </div>
      <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-muted" />}>
        <TemplatesList />
      </Suspense>
    </div>
  );
}
