"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Hash,
  Info,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

import { PlanDrawerContext } from "./PlanDrawerContext";
import Drawer from "@/components/ds/Drawer";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import FeaturesEditor from "./FeaturesEditor";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  createPlanAction,
  fetchPlanDetailAction,
  togglePlanActiveAction,
  updatePlanAction,
  type CreatePlanState,
  type PlanDetailResult,
  type UpdatePlanState,
} from "@/actions/plans";

import type { AdminPlan } from "@/types/api";
import { cn } from "@/lib/utils";

export default function PlansDrawerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("plansDrawer");
  const router = useRouter();

  const [viewId, setViewId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function openView(id: string) {
    setViewId(id);
  }

  function openCreate() {
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  function closeView() {
    setViewId(null);
  }

  function handleCreateSuccess(id: string) {
    setCreateOpen(false);
    setViewId(id);
    router.refresh();
  }

  return (
    <PlanDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title={t("create.title")}
        subtitle={t("create.subtitle")}
        width={500}
      >
        <CreatePlanContent
          onSuccess={handleCreateSuccess}
          onClose={closeCreate}
        />
      </Drawer>

      <Drawer
        open={!!viewId}
        onClose={closeView}
        title={t("details.title")}
        width={580}
      >
        {viewId && (
          <PlanDetailContent
            planId={viewId}
            onClose={closeView}
            onMutate={() => router.refresh()}
          />
        )}
      </Drawer>
    </PlanDrawerContext.Provider>
  );
}

// ── Create Plan ───────────────────────────────────────────────────────────────

function CreatePlanContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("plansDrawer");

  const [state, dispatch, isPending] = useActionState<
    CreatePlanState,
    FormData
  >(createPlanAction, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onSuccess(state.plan_id);
    }
  }, [state, onSuccess]);

  const error = state && "error" in state ? state.error : null;

  return (
    <div className="p-5">
      {error && <ErrorBox message={error} className="mb-4" />}

      <form action={dispatch} className="space-y-5">
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <Package size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {t("create.sections.basic")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("create.sections.basicHint")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <FormField label={t("fields.name")} required>
              <input
                name="name"
                type="text"
                placeholder={t("placeholders.name")}
                required
                className={inputCls}
              />
            </FormField>

            <FormField
              label={t("fields.description")}
              hint={t("hints.description")}
            >
              <textarea
                name="description"
                rows={3}
                placeholder={t("placeholders.description")}
                className={cn(inputCls, "resize-none leading-relaxed")}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionTitle
            icon={<DollarSign size={15} />}
            title={t("create.sections.pricing")}
            subtitle={t("create.sections.pricingHint")}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label={t("fields.price")}
              required
              hint={t("hints.price")}
            >
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
                className={inputCls}
              />
            </FormField>

            <FormField label={t("fields.currency")}>
              <select name="currency" defaultValue="SDG" className={inputCls}>
                <option value="SDG">{t("currency.sdg")}</option>
              </select>
            </FormField>
          </div>

          <div className="mt-3">
            <FormField
              label={t("fields.durationDays")}
              hint={t("hints.durationDays")}
            >
              <input
                name="duration_days"
                type="number"
                min="1"
                placeholder={t("placeholders.durationDays")}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionTitle
            icon={<Store size={15} />}
            title={t("create.sections.limits")}
            subtitle={t("create.sections.limitsHint")}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label={t("fields.maxShops")}>
              <input
                name="max_shops"
                type="number"
                min="0"
                placeholder="0"
                className={inputCls}
              />
            </FormField>

            <FormField label={t("fields.maxProducts")}>
              <input
                name="max_products"
                type="number"
                min="0"
                placeholder="0"
                className={inputCls}
              />
            </FormField>

            <FormField label={t("fields.maxUsers")}>
              <input
                name="max_users"
                type="number"
                min="0"
                placeholder="0"
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionTitle
            icon={<Sparkles size={15} />}
            title={t("fields.features")}
            subtitle={t("hints.features")}
          />

          <div className="mt-4">
            <FeaturesEditor name="features" />
          </div>
        </div>

        <FormField label={t("fields.sortOrder")} hint={t("hints.sortOrder")}>
          <input
            name="sort_order"
            type="number"
            min="0"
            placeholder="0"
            className={inputCls}
          />
        </FormField>

        <div className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-success" />
          <p className="text-xs leading-relaxed text-success/80">
            {t.rich("create.paidNotice", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            {t("actions.cancel")}
          </Button>

          <Button
            variant="default"
            size="sm"
            type="submit"
            disabled={isPending}
          >
            {isPending ? t("actions.creating") : t("actions.createPlan")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Plan Detail ───────────────────────────────────────────────────────────────

function PlanDetailContent({
  planId,
  onClose: _onClose,
  onMutate,
}: {
  planId: string;
  onClose: () => void;
  onMutate: () => void;
}) {
  const t = useTranslations("plansDrawer");
  const locale = useLocale();

  const [plan, setPlan] = useState<AdminPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const result: PlanDetailResult = await fetchPlanDetailAction(planId);

    if (result.ok) {
      setPlan(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !plan) {
    return (
      <div className="p-5">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-destructive">
            {t("details.loadFailed")}
          </p>

          {errorMsg && (
            <p className="mt-2 break-all font-mono text-xs text-destructive/80">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={load}
            className="mt-4 text-xs font-semibold text-primary hover:underline"
          >
            {t("actions.retry")}
          </button>
        </div>
      </div>
    );
  }

  const created = formatDate(plan.created_at, locale);
  const updated = formatDate(plan.updated_at, locale);
  const price = formatMoney(plan.price, plan.currency, locale);

  function handleMutate() {
    load();
    onMutate();
  }

  return (
    <div>
      <div className="relative">
        <div
          className={cn(
            "h-[88px] bg-gradient-to-br",
            plan.is_active
              ? "from-success/25 via-success/5 to-transparent"
              : "from-muted/80 via-muted/20 to-transparent",
          )}
        />

        <div className="border-b border-border px-5 pb-4">
          <div className="-mt-11 flex items-end gap-4">
            <div
              className={cn(
                "flex size-20 shrink-0 items-center justify-center rounded-2xl ring-4 ring-card",
                plan.is_active ? "bg-success/10" : "bg-muted",
              )}
            >
              <Package
                size={34}
                className={
                  plan.is_active ? "text-success" : "text-muted-foreground"
                }
              />
            </div>

            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[19px] font-black leading-tight text-foreground">
                  {plan.name}
                </p>

                <Badge dot variant={plan.is_active ? "success" : "warning"}>
                  {plan.is_active ? t("status.active") : t("status.inactive")}
                </Badge>

                {plan.is_free && (
                  <Badge variant="info">{t("status.demo")}</Badge>
                )}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {t("details.activeSubscriptions", {
                  count: plan.subscription_count,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="grid grid-cols-1 gap-2">
          <MetaRow
            icon={<DollarSign size={11} />}
            label={t("fields.price")}
            value={price}
          />
          <MetaRow
            icon={<Clock size={11} />}
            label={t("fields.duration")}
            value={t("details.days", { count: plan.duration_days })}
          />
          <MetaRow
            icon={<Hash size={11} />}
            label={t("fields.sortOrderShort")}
            value={`${plan.sort_order}`}
          />
          <MetaRow
            icon={<Calendar size={11} />}
            label={t("fields.created")}
            value={created}
          />
          <MetaRow
            icon={<Calendar size={11} />}
            label={t("fields.updated")}
            value={updated}
          />

          {plan.description && (
            <MetaRow
              icon={<Info size={11} />}
              label={t("fields.notes")}
              value={plan.description}
            />
          )}
        </div>
      </div>

      <div className="border-b border-border px-5 py-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatBox
            label={t("stats.subscriptions")}
            value={`${plan.subscription_count}`}
            color="text-success"
            bg="bg-success/10"
          />
          <StatBox
            label={t("stats.maxShops")}
            value={`${plan.max_shops}`}
            color="text-info"
            bg="bg-info/10"
          />
          <StatBox
            label={t("stats.maxUsers")}
            value={`${plan.max_users}`}
            color="text-primary"
            bg="bg-primary/10"
          />
        </div>
      </div>

      <div className="border-b border-border px-5 py-4">
        <SectionHeader>{t("details.planLimits")}</SectionHeader>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <LimitItem
            icon={<Store size={14} />}
            label={t("limits.shops")}
            value={plan.max_shops}
          />
          <LimitItem
            icon={<ShoppingBag size={14} />}
            label={t("limits.products")}
            value={plan.max_products}
          />
          <LimitItem
            icon={<Users size={14} />}
            label={t("limits.users")}
            value={plan.max_users}
          />
        </div>

        <FeaturePreview features={plan.features} />
      </div>

      <div className="px-5 py-4">
        <SectionHeader>{t("details.actions")}</SectionHeader>

        <div className="mt-3 space-y-2">
          <EditPlanInline plan={plan} onSuccess={handleMutate} />
          <TogglePlanInline plan={plan} onSuccess={handleMutate} />
        </div>
      </div>
    </div>
  );
}

// ── Edit Plan ─────────────────────────────────────────────────────────────────

function EditPlanInline({
  plan,
  onSuccess,
}: {
  plan: AdminPlan;
  onSuccess: () => void;
}) {
  const t = useTranslations("plansDrawer");

  const [open, setOpen] = useState(false);

  const action = updatePlanAction.bind(null, plan.id);
  const [state, dispatch, isPending] = useActionState<
    UpdatePlanState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setOpen(false);
      onSuccess();
    }
  }, [state, onSuccess]);

  const error = state && "error" in state ? state.error : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-start transition-colors hover:bg-muted/40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10">
          <Edit2 size={14} className="text-success" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-foreground">
            {t("edit.title")}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {t("edit.subtitle")}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-muted/20 p-4">
          {error && <ErrorBox message={error} className="mb-3" />}

          <form action={dispatch} className="space-y-4">
            <FormField label={t("fields.name")} required>
              <input
                name="name"
                type="text"
                defaultValue={plan.name}
                required
                className={inputCls}
              />
            </FormField>

            <FormField label={t("fields.description")}>
              <textarea
                name="description"
                rows={3}
                defaultValue={plan.description}
                className={cn(inputCls, "resize-none leading-relaxed")}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t("fields.price")} required>
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={plan.price}
                  required
                  className={inputCls}
                />
              </FormField>

              <FormField label={t("fields.currency")}>
                <select
                  name="currency"
                  defaultValue={plan.currency}
                  className={inputCls}
                >
                  <option value="SDG">{t("currency.sdg")}</option>
                </select>
              </FormField>
            </div>

            <FormField label={t("fields.durationDays")}>
              <input
                name="duration_days"
                type="number"
                min="1"
                defaultValue={plan.duration_days}
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label={t("fields.maxShops")}>
                <input
                  name="max_shops"
                  type="number"
                  min="0"
                  defaultValue={plan.max_shops}
                  className={inputCls}
                />
              </FormField>

              <FormField label={t("fields.maxProducts")}>
                <input
                  name="max_products"
                  type="number"
                  min="0"
                  defaultValue={plan.max_products}
                  className={inputCls}
                />
              </FormField>

              <FormField label={t("fields.maxUsers")}>
                <input
                  name="max_users"
                  type="number"
                  min="0"
                  defaultValue={plan.max_users}
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label={t("fields.features")}>
              <FeaturesEditor name="features" defaultValue={plan.features} />
            </FormField>

            <FormField label={t("fields.sortOrder")}>
              <input
                name="sort_order"
                type="number"
                min="0"
                defaultValue={plan.sort_order}
                className={inputCls}
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
              >
                {t("actions.cancel")}
              </Button>

              <Button size="sm" type="submit" disabled={isPending}>
                {isPending ? t("actions.saving") : t("actions.save")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ── Toggle Active ─────────────────────────────────────────────────────────────

function TogglePlanInline({
  plan,
  onSuccess,
}: {
  plan: AdminPlan;
  onSuccess: () => void;
}) {
  const t = useTranslations("plansDrawer");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActivating = !plan.is_active;

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    const result = await togglePlanActiveAction(plan.id);

    setIsPending(false);

    if (!result || "error" in result) {
      setError(
        (result as { error: string } | null)?.error ?? t("errors.unknown"),
      );
      return;
    }

    setConfirmOpen(false);
    onSuccess();
  }

  return (
    <>
      {error && <ErrorBox message={error} />}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-colors",
          isActivating
            ? "border-success/20 bg-success/5 hover:bg-success/10"
            : "border-warning/20 bg-warning/5 hover:bg-warning/10",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            isActivating ? "bg-success/10" : "bg-warning/10",
          )}
        >
          {isActivating ? (
            <ToggleRight size={17} className="text-success" />
          ) : (
            <ToggleLeft size={17} className="text-warning" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[13px] font-bold",
              isActivating ? "text-success" : "text-warning",
            )}
          >
            {isActivating
              ? t("toggle.activateTitle")
              : t("toggle.deactivateTitle")}
          </span>

          <span
            className={cn(
              "mt-0.5 block text-xs",
              isActivating ? "text-success/70" : "text-warning/70",
            )}
          >
            {isActivating
              ? t("toggle.activateSubtitle")
              : t("toggle.deactivateSubtitle")}
          </span>
        </span>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={
          isActivating ? t("toggle.activateTitle") : t("toggle.deactivateTitle")
        }
        description={
          isActivating
            ? t("toggle.activateDescription")
            : t("toggle.deactivateDescription", { name: plan.name })
        }
        confirmLabel={
          isPending
            ? t("actions.saving")
            : isActivating
              ? t("actions.activate")
              : t("actions.deactivate")
        }
        variant={isActivating ? "primary" : "danger"}
      />
    </>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success/30 focus:border-success transition-colors";

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-foreground">
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </label>

      {children}

      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

function ErrorBox({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-semibold text-destructive">{message}</p>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground/70">
        {icon}
      </span>

      <span className="min-w-[88px] shrink-0 text-[11px] font-bold text-muted-foreground">
        {label}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs text-foreground",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-2xl p-3 text-center", bg)}>
      <p
        className={cn(
          "text-[24px] font-black leading-none tabular-nums",
          color,
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function LimitItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-black text-foreground tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

function FeaturePreview({ features }: { features: Record<string, unknown> }) {
  const t = useTranslations("plansDrawer");

  const entries = useMemo(() => Object.entries(features ?? {}), [features]);

  if (entries.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-4 text-center">
        <p className="text-xs font-semibold text-muted-foreground">
          {t("features.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.07em] text-muted-foreground">
        {t("fields.features")}
      </p>

      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground"
            title={`${key}: ${String(value)}`}
          >
            <span className="font-bold">{humanizeKey(key)}</span>
            <span className="text-muted-foreground">:</span>
            <span className="truncate text-muted-foreground">
              {formatFeatureValue(value)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[88px] bg-gradient-to-r from-muted/60 to-muted/20" />

      <div className="border-b border-border px-5 pb-4">
        <div className="-mt-11 flex items-end gap-4">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="flex-1 space-y-2 pb-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-b border-border px-5 py-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-4 w-full" />
        ))}
      </div>

      <div className="border-b border-border px-5 py-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: string | number, currency: string, locale: string) {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${currency}`;
  }
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFeatureValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
