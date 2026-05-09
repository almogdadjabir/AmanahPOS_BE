import { AlertCircle } from 'lucide-react';

interface Props {
  message?: string;
}

export function SectionError({ message = 'Failed to load data' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-destructive/20 bg-destructive/5">
      <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertCircle className="size-4 text-destructive" />
      </div>
      <p className="text-sm font-semibold text-destructive">{message}</p>
      <p className="text-xs text-destructive/70 mt-1">Refresh the page to try again.</p>
    </div>
  );
}
