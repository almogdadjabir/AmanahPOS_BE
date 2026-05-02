interface Props {
  title:       string;
  description?: string;
  action?:     React.ReactNode;
}

export default function PageTitle({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-[17px] font-semibold text-text-primary">{title}</h1>
        {description && <p className="text-xs text-text-hint mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
