type Props = {
  locale: string;
};

export default function CreateOwnerHeader({ locale }: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <a
        href={`/${locale}/owners`}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-white hover:bg-muted/40 transition-colors text-muted-foreground"
      >
        <BackIcon />
      </a>

      <div>
        <h1 className="text-[17px] font-semibold text-foreground">
          Create Owner
        </h1>

        <p className="text-xs text-muted-foreground mt-0.5">
          Register a new business owner account
        </p>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
