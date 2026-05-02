import EmptyState from "@/components/ds/EmptyState";
import Badge from "@/components/ui/Badge";
import type { AdminPlan } from "./types";
import { CreditIcon } from "./icons";

type Props = {
  plans: AdminPlan[];
};

export default function AdminSubscriptionPlans({ plans }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">
            Subscription Plans
          </p>

          <p className="text-xs text-text-hint mt-0.5">
            Plans available on the platform
          </p>
        </div>

        <Badge variant={plans.length > 0 ? "success" : "default"} dot>
          {plans.length} plan{plans.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={<CreditIcon />}
          title="No plans configured"
          description="Add subscription plans from the Django admin panel."
        />
      ) : (
        <div className="divide-y divide-border-soft">
          {plans.map((plan) => {
            const price = Number.parseFloat(plan.price);

            return (
              <div key={plan.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-text-primary">
                      {plan.name}
                    </p>

                    {plan.is_free && <Badge variant="info">Free</Badge>}

                    {!plan.is_active && (
                      <Badge variant="danger">Inactive</Badge>
                    )}
                  </div>

                  <p className="text-xs text-text-hint mt-0.5 truncate">
                    {plan.description}
                  </p>
                </div>

                <div className="text-end shrink-0">
                  <p className="text-[13px] font-bold text-text-primary">
                    {price === 0 ? "Free" : `${price} ${plan.currency}`}
                  </p>

                  <p className="text-[11px] text-text-hint">
                    {plan.duration_days}d · {plan.max_shops} shops ·{" "}
                    {plan.max_users} users
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
