type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
};

export default function OwnerFormField({
  label,
  required,
  hint,
  children,
}: Props) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>

      {children}

      {hint && <p className="text-[11px] text-text-hint mt-1">{hint}</p>}
    </div>
  );
}
