export default function OwnerDetailError() {
  return (
    <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-8 text-center">
      <p className="text-[14px] font-semibold text-danger">
        Failed to load owner
      </p>

      <p className="text-xs text-danger/70 mt-1">
        Check API connection and refresh.
      </p>
    </div>
  );
}
