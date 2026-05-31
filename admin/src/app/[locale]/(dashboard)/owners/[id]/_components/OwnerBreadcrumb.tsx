type Props = {
  locale: string;
  ownerName: string;
};

export default function OwnerBreadcrumb({ locale, ownerName }: Props) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <a
        href={`/${locale}/owners`}
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        Owners
      </a>

      <span className="text-muted-foreground">/</span>

      <span className="text-foreground font-medium truncate max-w-[240px]">
        {ownerName}
      </span>
    </div>
  );
}
