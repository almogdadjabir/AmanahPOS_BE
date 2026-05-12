import { getTranslations } from 'next-intl/server';
import { fetchAdminTemplate } from '@/services/notifications';
import TemplateForm from '../../_components/TemplateForm';
import { notFound } from 'next/navigation';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t        = await getTranslations('notifications');
  const template = await fetchAdminTemplate(id);
  if (!template) notFound();
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-6">{t('editTemplate')}</h2>
      <TemplateForm initial={template} />
    </div>
  );
}
