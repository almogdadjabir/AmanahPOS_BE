import Eyebrow from './Eyebrow';
import { cn } from '@/lib/cn';

type Props = {
  kicker: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
};

export default function SectionHead({
  kicker,
  title,
  subtitle,
  centered = true,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'mb-14',
        centered && 'text-center flex flex-col items-center',
        className,
      )}
    >
      <Eyebrow>{kicker}</Eyebrow>
      <h2 className="mt-4 text-[clamp(26px,3.5vw,40px)] font-black leading-tight tracking-tight text-text-primary text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-text-secondary text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );
}
