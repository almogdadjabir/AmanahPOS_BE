type Props = {
  locale: string;
  ownerName: string;
};

export default function OwnerBreadcrumb({ locale, ownerName }: Props) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <a
        href={`/${locale}/owners`}
        className="text-text-hint hover:text-primary transition-colors"
      >
        Owners
      </a>

      <span className="text-text-hint">/</span>

      <span className="text-text-primary font-medium truncate max-w-[240px]">
        {ownerName}
      </span>
    </div>
  );
}
