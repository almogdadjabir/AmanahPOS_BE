type Props = {
  message: string;
};

export default function ErrorBanner({ message }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-danger font-semibold bg-danger-light rounded-xl px-3.5 py-2.5">
      <AlertIcon />
      {message}
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
