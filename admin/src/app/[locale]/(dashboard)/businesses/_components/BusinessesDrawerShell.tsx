"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BusinessDrawerContext } from "./BusinessDrawerContext";
import Drawer from "@/components/ds/Drawer";
import Avatar from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createBusinessAction,
  fetchBusinessDetailAction,
  fetchBusinessFeaturesAction,
  toggleBusinessStatusAction,
  updateBusinessAction,
  updateBusinessFeatureAction,
  type CreateBusinessState,
  type UpdateBusinessState,
  type BusinessDetailResult,
} from "@/actions/businesses";
import type { AdminBusinessDetail, AdminBusinessShop } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Edit2,
  Ban,
  Check,
  X,
  ShoppingBag,
  Store,
  CreditCard,
  UtensilsCrossed,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";
import { searchOwnersAction } from "@/actions/subscriptions";
import type { AdminOwner, BusinessType } from "@/types/api";

export default function BusinessesDrawerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("businesses.drawer");

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
    <BusinessDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title={t("create.title")}
        subtitle={t("create.subtitle")}
        width={560}
      >
        <CreateBusinessContent
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
          <BusinessDetailContent
            businessId={viewId}
            onClose={closeView}
            onMutate={() => {
              router.refresh();
            }}
          />
        )}
      </Drawer>
    </BusinessDrawerContext.Provider>
  );
}

// ── Create Business ───────────────────────────────────────────────────────────

type SelectedOwner = {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
};

function CreateBusinessContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("businesses.drawer");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [state, dispatch, isPending] = useActionState<
    CreateBusinessState,
    FormData
  >(createBusinessAction, null);

  const [step, setStep] = useState<"search" | "form">("search");
  const [selected, setSelected] = useState<SelectedOwner | null>(null);
  const [selectedType, setSelectedType] = useState<BusinessType>("shop");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminOwner[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

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

  function handleOwnerSelect(owner: AdminOwner) {
    setSelected({
      ownerId: owner.id,
      ownerName: owner.full_name,
      ownerPhone: owner.phone,
    });
    setStep("form");
  }

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onSuccess(state.business_id);
    }
  }, [state, onSuccess]);

  const error = state && "error" in state ? state.error : null;

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
                onClick={() => handleOwnerSelect(owner)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 px-4 py-3 transition-colors text-start"
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

                <NextIcon
                  size={13}
                  className="text-muted-foreground shrink-0"
                />
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
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3 mb-5">
        <CheckCircle2 size={16} className="text-success shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate">
            {selected!.ownerName}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {selected!.ownerPhone}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStep("search")}
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
        <input type="hidden" name="owner_id" value={selected!.ownerId} />
        <input type="hidden" name="business_type" value={selectedType} />

        <CreateFormField
          label={t("create.businessType")}
          required
          hint={t("create.businessTypeHint")}
        >
          <BusinessTypeSelector
            value={selectedType}
            onChange={setSelectedType}
          />
        </CreateFormField>

        <CreateFormField label={t("create.businessName")} required>
          <input
            name="name"
            type="text"
            placeholder={t("create.businessNamePlaceholder")}
            required
            autoFocus
            className={inputCls}
          />
        </CreateFormField>

        <CreateFormField label={t("create.address")}>
          <div className="relative">
            <MapPin
              size={13}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
            />
            <input
              name="address"
              type="text"
              placeholder={t("create.addressPlaceholder")}
              className={cn(inputCls, "ps-9")}
            />
          </div>
        </CreateFormField>

        <div className="grid grid-cols-2 gap-3">
          <CreateFormField label={t("create.businessPhone")}>
            <div className="relative">
              <Phone
                size={13}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
              />
              <input
                name="phone"
                type="tel"
                placeholder={t("create.phonePlaceholder")}
                className={cn(inputCls, "ps-9")}
              />
            </div>
          </CreateFormField>

          <CreateFormField label={t("create.email")}>
            <div className="relative">
              <Mail
                size={13}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
              />
              <input
                name="email"
                type="email"
                placeholder="biz@example.com"
                className={cn(inputCls, "ps-9")}
              />
            </div>
          </CreateFormField>
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
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                {t("create.creating")}
              </>
            ) : (
              t("create.submit")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function BusinessTypeSelector({
  value,
  onChange,
}: {
  value: BusinessType;
  onChange: (v: BusinessType) => void;
}) {
  const t = useTranslations("businesses.drawer");

  const options: {
    value: BusinessType;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "shop",
      label: t("businessType.shopLabel"),
      desc: t("businessType.shopDesc"),
      icon: <Store size={16} />,
    },
    {
      value: "restaurant",
      label: t("businessType.restaurantLabel"),
      desc: t("businessType.restaurantDesc"),
      icon: <UtensilsCrossed size={16} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex flex-col gap-2.5 rounded-xl border p-4 text-start transition-all",
            value === opt.value
              ? "border-primary/40 bg-primary/[0.05] ring-1 ring-primary/20"
              : "border-border bg-card hover:border-border/80 hover:bg-muted/30",
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center [&_svg]:size-[17px] transition-colors",
              value === opt.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground/60",
            )}
          >
            {opt.icon}
          </div>

          <div>
            <p
              className={cn(
                "text-[13px] font-bold leading-tight",
                value === opt.value
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {opt.label}
            </p>
            <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
              {opt.desc}
            </p>
          </div>

          {value === opt.value && (
            <span className="absolute top-3 end-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <Check
                size={9}
                strokeWidth={3}
                className="text-primary-foreground"
              />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function BusinessTypeBadge({ type }: { type: BusinessType }) {
  const t = useTranslations("businesses.drawer");

  if (type === "restaurant") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
        <UtensilsCrossed size={9} />
        {t("businessType.restaurantShort")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      <Store size={9} />
      {t("businessType.shopShort")}
    </span>
  );
}

function CreateFormField({
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
      <label className="block text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </label>

      {children}

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Business Detail ───────────────────────────────────────────────────────────

function BusinessDetailContent({
  businessId,
  onClose: _onClose,
  onMutate,
}: {
  businessId: string;
  onClose: () => void;
  onMutate: () => void;
}) {
  const t = useTranslations("businesses.drawer");
  const locale = useLocale();

  const [business, setBusiness] = useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureUpdating, setFeatureUpdating] = useState<string | null>(null);
  const [featureError, setFeatureError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    const result: BusinessDetailResult = await fetchBusinessDetailAction(businessId);

    if (result.ok) {
      setBusiness(result.data);
      const planId = result.data.active_subscription?.plan_id;
      if (planId && result.data.business_type === 'shop') {
        setFeaturesLoading(true);
        const featRes = await fetchBusinessFeaturesAction(planId);
        if (featRes.ok) setFeatures(featRes.features);
        setFeaturesLoading(false);
      }
    } else {
      setErrorMsg(result.error);
    }

    setLoading(false);
  }

  async function handleFeatureToggle(featureKey: string, currentValue: boolean) {
    const planId = business?.active_subscription?.plan_id;
    if (!planId) return;
    setFeatureUpdating(featureKey);
    setFeatureError(null);
    const result = await updateBusinessFeatureAction(planId, featureKey, !currentValue);
    if (result && 'error' in result) {
      setFeatureError(result.error);
    } else {
      setFeatures(prev => prev ? { ...prev, [featureKey]: !currentValue } : prev);
    }
    setFeatureUpdating(null);
  }

  useEffect(() => {
    load();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !business) {
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

  const created = new Date(business.created_at).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const updated = new Date(business.updated_at).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleMutate() {
    load();
    onMutate();
  }

  return (
    <div>
      <div className="relative">
        <div className="h-[72px] bg-gradient-to-br from-info/20 via-primary/10 to-transparent" />

        <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
          <div className="relative shrink-0">
            <div className="rounded-xl ring-4 ring-card overflow-hidden w-16 h-16 bg-primary/10 flex items-center justify-center">
              <span className="text-[24px] font-black text-primary uppercase">
                {business.name.charAt(0)}
              </span>
            </div>

            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                business.is_active ? "bg-success" : "bg-muted-foreground/50",
              )}
            />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-foreground leading-tight truncate">
                {business.name}
              </p>

              <Badge
                variant={business.is_active ? "success" : "danger"}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  business.is_active
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20",
                )}
              >
                {business.is_active ? t("status.active") : t("status.inactive")}
              </Badge>

              <BusinessTypeBadge type={business.business_type ?? "shop"} />
            </div>

            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              {business.slug}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 space-y-1">
        <MetaRow
          icon={
            <Avatar
              name={business.owner_name || business.owner_phone}
              size={14}
            />
          }
          value={business.owner_name || business.owner_phone}
        />

        <MetaRow icon={<Phone size={10} />} value={business.owner_phone} mono />

        {business.phone && (
          <MetaRow icon={<Phone size={10} />} value={business.phone} />
        )}

        {business.email && (
          <MetaRow icon={<Mail size={10} />} value={business.email} />
        )}

        {business.address && (
          <MetaRow icon={<MapPin size={10} />} value={business.address} />
        )}

        <MetaRow
          icon={<Calendar size={10} />}
          value={t("details.created", { date: created })}
        />

        <MetaRow
          icon={<Clock size={10} />}
          value={t("details.updated", { date: updated })}
        />
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label={t("details.shops")}
            value={String(business.shop_count)}
            color="text-primary"
            bg="bg-primary/10"
          />

          <StatBox
            label={t("details.subscription")}
            value={
              business.has_active_subscription
                ? t("subscription.active")
                : t("subscription.noPlan")
            }
            color={
              business.has_active_subscription
                ? "text-success"
                : "text-muted-foreground"
            }
            bg={business.has_active_subscription ? "bg-success/10" : "bg-muted"}
          />

          <StatBox
            label={t("details.planExpiry")}
            value={
              business.active_subscription
                ? t("subscription.daysLeft", {
                    count: business.active_subscription.days_remaining,
                  })
                : "—"
            }
            color={
              business.active_subscription &&
              business.active_subscription.days_remaining <= 7
                ? "text-warning"
                : "text-foreground"
            }
            bg="bg-muted"
          />
        </div>

        {business.active_subscription && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
            <CreditCard size={13} className="text-success shrink-0" />

            <p className="text-xs text-success font-semibold">
              {business.active_subscription.plan_name}
            </p>

            <span className="text-xs text-muted-foreground ms-auto">
              {t("subscription.expires", {
                date: new Date(
                  business.active_subscription.end_date,
                ).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              })}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 flex-wrap">
        <EditBusinessInline business={business} onSuccess={handleMutate} />
        <ToggleStatusInline business={business} onSuccess={handleMutate} />
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
            <Store />
          </span>

          <p className="text-xs font-bold text-foreground">
            {t("details.shops")}
          </p>

          <span className="text-[11px] text-muted-foreground font-normal">
            ({business.shops.length})
          </span>
        </div>

        {business.shops.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            {t("shop.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {business.shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>

      {/* Premium features — shops with active plan only */}
      {business.business_type === 'shop' && (
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap size={11} />
            </span>
            <p className="text-xs font-bold text-foreground">
              {t('features.sectionTitle')}
            </p>
          </div>

          {!business.active_subscription ? (
            <p className="text-[11px] text-muted-foreground italic">
              {t('features.noSubscription')}
            </p>
          ) : featuresLoading ? (
            <div className="h-14 rounded-xl bg-muted animate-pulse" />
          ) : features ? (
            <div className="space-y-2">
              {featureError && (
                <p className="text-[11px] text-destructive font-semibold">{featureError}</p>
              )}
              <FeatureToggleRow
                label={t('features.inboundReceiving')}
                description={t('features.inboundReceivingDesc')}
                enabled={features.inventory_inbound_receiving ?? false}
                updating={featureUpdating === 'inventory_inbound_receiving'}
                onToggle={() =>
                  handleFeatureToggle(
                    'inventory_inbound_receiving',
                    features.inventory_inbound_receiving ?? false,
                  )
                }
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Detail Skeleton ───────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[72px] bg-muted/40" />

      <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
        <Skeleton className="w-16 h-16 rounded-xl ring-4 ring-card shrink-0" />

        <div className="flex-1 pb-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-48" />
        ))}
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg bg-muted p-3 space-y-1.5">
              <Skeleton className="h-2 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-3.5 border-b border-border flex gap-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop }: { shop: AdminBusinessShop }) {
  const t = useTranslations("businesses.drawer");
  const locale = useLocale();

  const created = new Date(shop.created_at).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3.5 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-muted/60 to-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="size-3.5 text-primary" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-foreground truncate">
                {shop.name}
              </p>

              {shop.is_main && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wide">
                  {t("shop.main")}
                </span>
              )}
            </div>

            {shop.address && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                {shop.address}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant={shop.is_active ? "success" : "danger"}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              shop.is_active
                ? "bg-success/10 text-success border-success/20"
                : "bg-destructive/10 text-destructive border-destructive/20",
            )}
          >
            {shop.is_active ? t("shop.open") : t("shop.closed")}
          </Badge>

          <span className="text-[10px] text-muted-foreground">{created}</span>
        </div>
      </div>

      {shop.phone && (
        <div className="px-3.5 py-2 bg-card border-t border-border/60">
          <MetaRow icon={<Phone size={10} />} value={shop.phone} mono />
        </div>
      )}
    </div>
  );
}

// ── Edit business inline ──────────────────────────────────────────────────────

function EditBusinessInline({
  business,
  onSuccess,
}: {
  business: AdminBusinessDetail;
  onSuccess: () => void;
}) {
  const t = useTranslations("businesses.drawer");

  const [open, setOpen] = useState(false);
  const boundAction = updateBusinessAction.bind(null, business.id);

  const [state, dispatch, isPending] = useActionState<
    UpdateBusinessState,
    FormData
  >(boundAction, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setOpen(false);
      onSuccess();
    }
  }, [state, onSuccess]);

  const error = state && "error" in state ? state.error : null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Edit2 size={13} />
        {t("edit.button")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div className="relative bg-card rounded-2xl shadow-card-lg border border-border w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-foreground">
                {t("edit.title")}
              </p>

              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-xs font-semibold text-destructive">
                  {error}
                </p>
              </div>
            )}

            <form action={dispatch} className="space-y-4">
              <Input
                label={t("create.businessName")}
                name="name"
                type="text"
                defaultValue={business.name}
                required
              />

              <Input
                label={t("create.address")}
                name="address"
                type="text"
                defaultValue={business.address ?? ""}
                placeholder={t("edit.addressPlaceholder")}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("create.businessPhone")}
                  name="phone"
                  type="tel"
                  defaultValue={business.phone ?? ""}
                  placeholder="+971 50 000 0000"
                />

                <Input
                  label={t("create.email")}
                  name="email"
                  type="email"
                  defaultValue={business.email ?? ""}
                  placeholder="biz@example.com"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  {t("common.cancel")}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? t("edit.saving") : t("edit.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Toggle status inline ──────────────────────────────────────────────────────

function ToggleStatusInline({
  business,
  onSuccess,
}: {
  business: AdminBusinessDetail;
  onSuccess: () => void;
}) {
  const t = useTranslations("businesses.drawer");

  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    start(async () => {
      const res = await toggleBusinessStatusAction(business.id);

      if (res && "error" in res) {
        setError(res.error);
      } else {
        setOpen(false);
        onSuccess();
      }
    });
  }

  return (
    <>
      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <Button
        variant={business.is_active ? "destructive" : "secondary"}
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={isPending}
      >
        {business.is_active ? (
          <>
            <Ban size={13} />
            {t("status.deactivate")}
          </>
        ) : (
          <>
            <Check size={13} />
            {t("status.activate")}
          </>
        )}
      </Button>

      <ConfirmDialog
        open={open}
        title={
          business.is_active
            ? t("status.deactivateTitle")
            : t("status.activateTitle")
        }
        description={
          business.is_active
            ? t("status.deactivateDescription", { name: business.name })
            : t("status.activateDescription", { name: business.name })
        }
        confirmLabel={
          business.is_active ? t("status.deactivate") : t("status.activate")
        }
        variant={business.is_active ? "danger" : "primary"}
        loading={isPending}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────

function MetaRow({
  icon,
  value,
  mono,
}: {
  icon: React.ReactNode;
  value: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        mono && "font-mono",
      )}
    >
      <span className="text-muted-foreground/60 shrink-0">{icon}</span>
      {value}
    </span>
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
    <div className={cn("rounded-lg px-3 py-2.5", bg)}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </p>

      <p className={cn("text-sm font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

function FeatureToggleRow({
  label,
  description,
  enabled,
  updating,
  onToggle,
}: {
  label:       string;
  description: string;
  enabled:     boolean;
  updating:    boolean;
  onToggle:    () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={updating}
        aria-pressed={enabled}
        className={cn(
          'relative shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          enabled ? 'bg-success' : 'bg-muted-foreground/30',
          updating && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
