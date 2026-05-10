import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { UserPlus, CreditCard, ArrowRight } from 'lucide-react';
import CreateOwnerButton from '../../owners/_components/CreateOwnerButton';

export default async function AdminQuickActions() {
  const t = await getTranslations('dashboard');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ActionCard
        icon={<UserPlus />}
        iconClass="bg-primary/10 text-primary"
        title={t('quickActions.createOwnerTitle')}
        description={t('quickActions.createOwnerDesc')}
        cta={<CreateOwnerButton />}
      />
      <ActionCard
        icon={<CreditCard />}
        iconClass="bg-info/10 text-info"
        title={t('quickActions.manageSubsTitle')}
        description={t('quickActions.manageSubsDesc')}
        cta={
          <Button variant="secondary" size="sm" asChild>
            <Link href="subscriptions" className="gap-1.5">
              {t('quickActions.viewSubscriptions')} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function ActionCard({
  icon,
  iconClass,
  title,
  description,
  cta,
}: {
  icon:        React.ReactNode;
  iconClass:   string;
  title:       string;
  description: string;
  cta:         React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3.5">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 [&_svg]:size-5 ${iconClass}`}>
          {icon}
        </span>
        <div>
          <p className="text-[13px] font-bold text-foreground leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="mt-auto">{cta}</div>
    </div>
  );
}
