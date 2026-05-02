import Button from "@/components/ui/Button";
import CreateOwnerButton from "../../owners/_components/CreateOwnerButton";

export default function AdminQuickActions() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-border-soft shadow-card p-5">
        <p className="text-[13px] font-semibold text-text-primary mb-1">
          Create Owner Account
        </p>

        <p className="text-xs text-text-hint mb-4">
          Register a new business owner. They can log in and set up their
          business.
        </p>

        <CreateOwnerButton />
      </div>

      <div className="bg-white rounded-xl border border-border-soft shadow-card p-5">
        <p className="text-[13px] font-semibold text-text-primary mb-1">
          Manage Subscriptions
        </p>

        <p className="text-xs text-text-hint mb-4">
          View active plans, assign subscriptions, or handle expired accounts.
        </p>

        <Button variant="default" size="sm" as="a" href="subscriptions">
          View Subscriptions
        </Button>
      </div>
    </div>
  );
}
