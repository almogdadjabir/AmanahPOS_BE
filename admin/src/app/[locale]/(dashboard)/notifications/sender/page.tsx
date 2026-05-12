import { getTranslations } from 'next-intl/server';
import PushSenderForm from './_components/PushSenderForm';

export default async function SenderPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">{t('senderDescription')}</p>
      <PushSenderForm />
    </div>
  );
}
