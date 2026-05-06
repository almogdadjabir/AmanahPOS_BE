export default function AdminDashboardError() {
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
      <p className="text-[14px] font-semibold text-destructive mb-1">
        Failed to load dashboard
      </p>
      <p className="text-xs text-destructive/70">
        Check the API connection and try refreshing.
      </p>
    </div>
  );
}
