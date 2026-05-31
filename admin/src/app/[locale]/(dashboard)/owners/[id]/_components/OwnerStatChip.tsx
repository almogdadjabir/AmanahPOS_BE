type Props = {
  label: string;
  value: string;
  accent: string;
};

export default function OwnerStatChip({ label, value, accent }: Props) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>

      <p className={`text-[14px] font-bold mt-0.5 ${accent}`}>{value}</p>
    </div>
  );
}
