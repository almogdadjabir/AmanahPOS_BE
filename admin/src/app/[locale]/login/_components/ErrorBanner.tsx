import { AlertCircle } from 'lucide-react';

type Props = {
  message: string;
};

export default function ErrorBanner({ message }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-destructive font-semibold bg-destructive/10 rounded-xl px-3.5 py-2.5">
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </div>
  );
}
