"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SubscriptionDrawerContext } from "./SubscriptionDrawerContext";
import Drawer from "@/components/ds/Drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createSubscriptionAction,
  fetchSubscriptionDetailAction,
  fetchPlansAction,
  updateSubscriptionAction,
  deactivateSubscriptionAction,
  searchOwnersAction,
  fetchOwnerDetailAction,
  type CreateSubscriptionState,
  type UpdateSubscriptionState,
  type SubscriptionDetailResult,
} from "@/actions/subscriptions";
import type {
  AdminSubscriptionDetail,
  AdminPlan,
  AdminOwner,
} from "@/types/api";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Building2,
  User,
  Phone,
  Calendar,
  Clock,
  Edit2,
  Ban,
  Info,
  Package,
  Users,
  Store,
  ShoppingBag,
  Hash,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function SubscriptionsDrawerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("subscriptions.drawer");

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
    <SubscriptionDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title={t("create.title")}
        subtitle={t("create.subtitle")}
        width={480}
      >
        <CreateSubscriptionContent
          onSuccess={handleCreateSuccess}
          onClose={closeCreate}
        />
      </Drawer>

      <Drawer
        open={!!viewId}
        onClose={closeView}
        title={t("details.title")}
        width={560}
      >
        {viewId && (
          <SubscriptionDetailContent
            subscriptionId={viewId}
            onClose={closeView}
            onMutate={() => {
              router.refresh();
            }}
          />
        )}
      </Drawer>
    </SubscriptionDrawerContext.Provider>
  );
}

// ── Create Subscription ───────────────────────────────────────────────────────

type SelectedOwner = {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  businessId: string;
  businessName: string;
};

function CreateSubscriptionContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("subscriptions.drawer");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [state, dispatch, isPending] = useActionState<
    CreateSubscriptionState,
    FormData
  >(createSubscriptionAction, null);

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [plansErr, setPlansErr] = useState(false);

  const [step, setStep] = useState<"search" | "form">("search");
  const [selected, setSelected] = useState<SelectedOwner | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminOwner[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchErr(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchErr(null);

      const result = await searchOwnersAction(searchQuery);

      if (result.ok) {
        setSearchResults(result.data);
      } else {
        setSearchErr(result.error);
      }

      setSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleOwnerSelect(owner: AdminOwner) {
    setResolvingId(owner.id);
    setResolveErr(null);

    const result = await fetchOwnerDetailAction(owner.id);

    setResolvingId(null);

    if (!result.ok) {
      setResolveErr(result.error);
      return;
    }

    const biz =
      result.data.businesses.find((b) => b.is_active) ??
      result.data.businesses[0];

    if (!biz) {
      setResolveErr(
        t("create.noBusinessForOwner", {
          name: owner.full_name || owner.phone,
        }),
      );
      return;
    }

    setSelected({
      ownerId: owner.id,
      ownerName: owner.full_name,
      ownerPhone: owner.phone,
      businessId: biz.id,
      businessName: biz.name,
    });

    setStep("form");
  }

  useEffect(() => {
    if (step !== "form" || plans.length > 0) return;

    fetchPlansAction().then((result) => {
      if (result.ok) {
        setPlans(result.data);
      } else {
        setPlansErr(true);
      }
    });
  }, [step, plans.length]);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onSuccess(state.subscription_id);
    }
  }, [state, onSuccess]);

  const error = state && "error" in state ? state.error : null;
  const today = new Date().toISOString().split("T")[0];
  const paidPlans = plans.filter((p) => p.is_active && !p.is_free);
  const demoPlans = plans.filter((p) => p.is_active && p.is_free);

  if (step === "search") {
    return (
      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          {t("create.searchHint")}
        </p>

        <div className="relative">
          <Search
            size={14}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("create.searchPlaceholder")}
            autoFocus
            className={cn(inputCls, "ps-9")}
          />

          {searching && (
            <Loader2
              size={13}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            />
          )}
        </div>

        {resolveErr && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-xs font-semibold text-destructive">
              {resolveErr}
            </p>
          </div>
        )}

        {searchErr && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-xs font-semibold text-destructive">
              {searchErr}
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-1.5">
            {searchResults.map((owner) => (
              <button
                key={owner.id}
                type="button"
                disabled={!!resolvingId}
                onClick={() => handleOwnerSelect(owner)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 px-4 py-3 transition-colors text-start disabled:opacity-60"
              >
                <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[13px] font-bold text-primary">
                  {(owner.full_name || owner.phone).charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {owner.full_name || t("common.noName")}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {owner.phone}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      owner.has_active_subscription
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {owner.has_active_subscription
                      ? t("create.ownerHasSub")
                      : t("create.ownerNoSub")}
                  </span>

                  <span className="text-[10px] text-muted-foreground">
                    {t("create.businessCount", { count: owner.business_count })}
                  </span>
                </div>

                {resolvingId === owner.id ? (
                  <Loader2
                    size={13}
                    className="text-muted-foreground animate-spin shrink-0"
                  />
                ) : (
                  <NextIcon
                    size={13}
                    className="text-muted-foreground shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {!searching &&
          searchQuery.trim() &&
          searchResults.length === 0 &&
          !searchErr && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("create.noOwnersFound", { query: searchQuery })}
            </p>
          )}

        {!searchQuery.trim() && (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center">
            <Search
              size={20}
              className="text-muted-foreground/40 mx-auto mb-2"
            />
            <p className="text-xs text-muted-foreground">
              {t("create.typeToSearch")}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3 mb-4">
        <CheckCircle2 size={16} className="text-success shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate">
            {selected!.ownerName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {selected!.businessName} · {selected!.ownerPhone}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep("search");
            setResolveErr(null);
          }}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <BackIcon size={11} />
          {t("create.changeOwner")}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      )}

      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="business_id" value={selected!.businessId} />

        <FormField label={t("create.plan")} required>
          {plansErr ? (
            <p className="text-xs text-destructive">
              {t("create.failedToLoadPlans")}
            </p>
          ) : plans.length === 0 ? (
            <div className={cn(inputCls, "animate-pulse bg-muted")} />
          ) : (
            <select name="plan_id" required className={inputCls}>
              <option value="">{t("create.selectPlan")}</option>

              {paidPlans.length > 0 && (
                <optgroup label={t("create.paidPlans")}>
                  {paidPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {parseFloat(p.price).toFixed(0)} {p.currency} /{" "}
                      {t("create.daysShort", { count: p.duration_days })}
                    </option>
                  ))}
                </optgroup>
              )}

              {demoPlans.length > 0 && (
                <optgroup label={t("create.demoAccess")}>
                  {demoPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t("plan.demo")}) —{" "}
                      {t("create.daysShort", { count: p.duration_days })}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </FormField>

        <FormField label={t("create.startDate")} required>
          <input
            name="start_date"
            type="date"
            defaultValue={today}
            required
            className={inputCls}
          />
        </FormField>

        <FormField
          label={t("create.paymentReference")}
          hint={t("create.paymentReferenceHint")}
        >
          <input
            name="payment_reference"
            type="text"
            placeholder="e.g. INV-2024-001"
            className={inputCls}
          />
        </FormField>

        <FormField label={t("create.notes")} hint={t("create.notesHint")}>
          <textarea
            name="notes"
            rows={2}
            placeholder={t("create.notesPlaceholder")}
            className={cn(inputCls, "resize-none")}
          />
        </FormField>

        <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3">
          <Info size={15} className="shrink-0 mt-0.5 text-warning" />
          <p className="text-xs text-warning/80 leading-relaxed">
            {t("create.paymentNote")}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>

          <Button
            variant="default"
            size="sm"
            type="submit"
            disabled={isPending}
          >
            {isPending ? t("create.creating") : t("create.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Subscription Detail ───────────────────────────────────────────────────────

function SubscriptionDetailContent({
  subscriptionId,
  onClose: _onClose,
  onMutate,
}: {
  subscriptionId: string;
  onClose: () => void;
  onMutate: () => void;
}) {
  const t = useTranslations("subscriptions.drawer");
  const locale = useLocale();

  const [sub, setSub] = useState<AdminSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    const result: SubscriptionDetailResult =
      await fetchSubscriptionDetailAction(subscriptionId);

    if (result.ok) {
      setSub(result.data);
    } else {
      setErrorMsg(result.error);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [subscriptionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !sub) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-destructive">
            {t("details.failedToLoad")}
          </p>

          {errorMsg && (
            <p className="text-xs font-mono text-destructive/80 mt-1 break-all">
              {errorMsg}
            </p>
          )}

          <button
            onClick={load}
            className="mt-3 text-xs font-semibold text-primary hover:underline"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const startDate = new Date(sub.start_date).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const endDate = new Date(sub.end_date).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const created = new Date(sub.created_at).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const updated = new Date(sub.updated_at).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const statusVariant = sub.is_expired
    ? "danger"
    : sub.is_active
      ? "success"
      : "warning";

  const statusLabel = sub.is_expired
    ? t("status.expired")
    : sub.is_active
      ? t("status.active")
      : t("status.inactive");

  const periodValue =
    locale === "ar" ? `${endDate} ← ${startDate}` : `${startDate} → ${endDate}`;

  function handleMutate() {
    load();
    onMutate();
  }

  return (
    <div>
      <div className="relative">
        <div
          className={cn(
            "h-[72px] bg-gradient-to-br",
            sub.is_expired
              ? "from-destructive/15 via-destructive/5 to-transparent"
              : sub.plan_is_free
                ? "from-info/20 via-info/5 to-transparent"
                : "from-warning/20 via-warning/5 to-transparent",
          )}
        />

        <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
          <div className="shrink-0">
            <div
              className={cn(
                "rounded-xl ring-4 ring-card overflow-hidden w-16 h-16 flex items-center justify-center",
                sub.is_expired
                  ? "bg-destructive/10"
                  : sub.plan_is_free
                    ? "bg-info/10"
                    : "bg-warning/10",
              )}
            >
              <CreditCard
                size={28}
                className={cn(
                  sub.is_expired
                    ? "text-destructive"
                    : sub.plan_is_free
                      ? "text-info"
                      : "text-warning",
                )}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-foreground leading-tight truncate">
                {sub.plan_name}
              </p>

              <Badge
                variant={statusVariant}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  sub.is_expired
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : sub.is_active
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning border-warning/20",
                )}
              >
                {statusLabel}
              </Badge>

              {sub.plan_is_free && (
                <Badge
                  variant="info"
                  className="rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info"
                >
                  {t("plan.demo")}
                </Badge>
              )}
            </div>

            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              {sub.business_name}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 space-y-1">
        <MetaRow
          icon={<Building2 size={10} />}
          label={t("meta.business")}
          value={sub.business_name}
        />
        <MetaRow
          icon={<User size={10} />}
          label={t("meta.owner")}
          value={sub.owner_name || "—"}
        />
        <MetaRow
          icon={<Phone size={10} />}
          label={t("meta.phone")}
          value={sub.owner_phone}
          mono
        />
        <MetaRow
          icon={<Calendar size={10} />}
          label={t("meta.period")}
          value={periodValue}
        />
        <MetaRow
          icon={<Clock size={10} />}
          label={t("meta.created")}
          value={created}
        />
        <MetaRow
          icon={<Clock size={10} />}
          label={t("meta.updated")}
          value={updated}
        />

        {sub.payment_reference && (
          <MetaRow
            icon={<Hash size={10} />}
            label={t("meta.ref")}
            value={sub.payment_reference}
            mono
          />
        )}
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label={t("stats.daysLeft")}
            value={sub.is_expired ? "0" : `${sub.days_remaining}`}
            color={
              sub.is_expired
                ? "text-destructive"
                : sub.days_remaining <= 7
                  ? "text-warning"
                  : "text-success"
            }
            bg={
              sub.is_expired
                ? "bg-destructive/10"
                : sub.days_remaining <= 7
                  ? "bg-warning/10"
                  : "bg-success/10"
            }
          />

          <StatBox
            label={t("stats.maxShops")}
            value={`${sub.max_shops}`}
            color="text-info"
            bg="bg-info/10"
          />

          <StatBox
            label={t("stats.maxUsers")}
            value={`${sub.max_users}`}
            color="text-primary"
            bg="bg-primary/10"
          />
        </div>
      </div>

      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">
          {t("limits.title")}
        </p>

        <div className="grid grid-cols-3 gap-3">
          <PlanLimitItem
            icon={<Store size={13} />}
            label={t("limits.shops")}
            value={sub.max_shops}
          />
          <PlanLimitItem
            icon={<Package size={13} />}
            label={t("limits.products")}
            value={sub.max_products}
          />
          <PlanLimitItem
            icon={<Users size={13} />}
            label={t("limits.users")}
            value={sub.max_users}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ShoppingBag size={11} />

          <span>
            {t("limits.duration")}{" "}
            <strong className="text-foreground">
              {t("create.daysShort", { count: sub.plan_duration })}
            </strong>
          </span>

          {!sub.plan_is_free && (
            <>
              <span className="text-border">·</span>
              <span>
                {t("limits.price")}{" "}
                <strong className="text-foreground">
                  {parseFloat(sub.plan_price).toFixed(2)} {sub.plan_currency}
                </strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">
          {t("actions.title")}
        </p>

        <EditSubscriptionInline sub={sub} onSuccess={handleMutate} />

        {sub.is_active && !sub.is_expired && (
          <DeactivateSubscriptionInline
            subscriptionId={sub.id}
            onSuccess={handleMutate}
          />
        )}

        {!sub.is_active && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <Ban size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t("actions.deactivatedInfo")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Subscription ─────────────────────────────────────────────────────────

function EditSubscriptionInline({
  sub,
  onSuccess,
}: {
  sub: AdminSubscriptionDetail;
  onSuccess: () => void;
}) {
  const t = useTranslations("subscriptions.drawer");

  const [open, setOpen] = useState(false);

  const action = updateSubscriptionAction.bind(null, sub.id);
  const [state, dispatch, isPending] = useActionState<
    UpdateSubscriptionState,
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
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 px-4 py-3 transition-colors text-start"
      >
        <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Edit2 size={13} className="text-primary" />
        </span>

        <div>
          <p className="text-[13px] font-semibold text-foreground">
            {t("edit.title")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("edit.description")}
          </p>
        </div>
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 mt-1">
          {error && (
            <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <p className="text-xs font-semibold text-destructive">{error}</p>
            </div>
          )}

          <form action={dispatch} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {t("create.paymentReference")}
              </label>

              <input
                name="payment_reference"
                type="text"
                defaultValue={sub.payment_reference}
                placeholder="e.g. INV-2024-001"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {t("create.notes")}
              </label>

              <textarea
                name="notes"
                rows={2}
                defaultValue={sub.notes}
                placeholder={t("create.notesPlaceholder")}
                className={cn(inputCls, "resize-none")}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
              >
                {t("common.cancel")}
              </button>

              <Button size="sm" type="submit" disabled={isPending}>
                {isPending ? t("edit.saving") : t("edit.save")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ── Deactivate Subscription ───────────────────────────────────────────────────

function DeactivateSubscriptionInline({
  subscriptionId,
  onSuccess,
}: {
  subscriptionId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("subscriptions.drawer");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    startTransition(async () => {
      const result = await deactivateSubscriptionAction(subscriptionId);

      if (!result || "error" in result) {
        setError(result?.error ?? t("common.unknownError"));
        return;
      }

      setConfirmOpen(false);
      onSuccess();
    });
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-semibold text-destructive">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 px-4 py-3 transition-colors text-start"
      >
        <span className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <Ban size={13} className="text-destructive" />
        </span>

        <div>
          <p className="text-[13px] font-semibold text-destructive">
            {t("deactivate.title")}
          </p>
          <p className="text-[11px] text-destructive/60 mt-0.5">
            {t("deactivate.description")}
          </p>
        </div>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={t("deactivate.title")}
        description={t("deactivate.confirmDescription")}
        confirmLabel={
          isPending ? t("deactivate.deactivating") : t("deactivate.confirm")
        }
        variant="danger"
      />
    </>
  );
}

// ── Shared micro-components ───────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

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
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </label>

      {children}

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-4 h-4 flex items-center justify-center text-muted-foreground/60 shrink-0">
        {icon}
      </span>

      <span className="text-[11px] font-semibold text-muted-foreground w-14 shrink-0">
        {label}
      </span>

      <span
        className={cn(
          "text-[12px] text-foreground truncate",
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
    <div className={cn("rounded-xl p-3 flex flex-col items-center gap-1", bg)}>
      <p
        className={cn(
          "text-[22px] font-black leading-none tabular-nums",
          color,
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.07em] text-center">
        {label}
      </p>
    </div>
  );
}

function PlanLimitItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>

      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[13px] font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[72px] bg-gradient-to-r from-muted/60 to-muted/20" />

      <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
        <Skeleton className="w-16 h-16 rounded-xl" />

        <div className="flex-1 space-y-2 pb-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
