import { getTranslations } from 'next-intl/server';
import TemplateForm from '../_components/TemplateForm';

export default async function NewTemplatePage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-6">{t('newTemplate')}</h2>
      <TemplateForm />
    </div>
  );
}
