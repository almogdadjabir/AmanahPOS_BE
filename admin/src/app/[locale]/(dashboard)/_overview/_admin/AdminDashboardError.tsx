import { getTranslations } from 'next-intl/server';

export default async function AdminDashboardError() {
  const t = await getTranslations('dashboard');
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
      <p className="text-[14px] font-semibold text-destructive mb-1">
        {t('error.title')}
      </p>
      <p className="text-xs text-destructive/70">
        {t('error.desc')}
      </p>
    </div>
  );
}
