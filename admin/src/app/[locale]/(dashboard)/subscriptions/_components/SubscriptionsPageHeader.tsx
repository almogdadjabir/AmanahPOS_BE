import { getLocale, getTranslations } from "next-intl/server";
import CreateSubscriptionButton from "./CreateSubscriptionButton";

export default async function SubscriptionsPageHeader() {
  const [t, locale] = await Promise.all([
    getTranslations("subscriptions"),
    getLocale(),
  ]);

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex items-start justify-between mb-4 gap-4">
      <div>
        <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
          {t("title")}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">{dateStr}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        <CreateSubscriptionButton />
      </div>
    </div>
  );
}
