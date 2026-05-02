import PageTitle from "@/components/ds/PageTitle";

export default function SystemErrorState() {
  return (
    <div>
      <PageTitle
        title="System"
        description="Platform health, infrastructure status, and diagnostics."
      />

      <div className="bg-danger-light border border-danger/20 rounded-xl p-6 text-center">
        <p className="text-[14px] font-semibold text-danger mb-1">
          Failed to load system status
        </p>

        <p className="text-xs text-danger/70">
          Check the API connection and try refreshing.
        </p>
      </div>
    </div>
  );
}
