interface Props {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-text-hint mb-4">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-semibold text-text-primary">{title}</p>
      {description && <p className="text-xs text-text-hint mt-1.5 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
