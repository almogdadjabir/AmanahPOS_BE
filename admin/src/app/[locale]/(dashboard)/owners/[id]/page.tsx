import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { fetchAdminOwner } from "@/services/admin";
import { ApiError } from "@/lib/api";

import OwnerBusinesses from "./_components/OwnerBusinesses";
import OwnerBreadcrumb from "./_components/OwnerBreadcrumb";
import OwnerDetailError from "./_components/OwnerDetailError";
import OwnerProfileCard from "./_components/OwnerProfileCard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OwnerDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();

  try {
    const owner = await fetchAdminOwner(id);
    const ownerName = owner.full_name || owner.phone;

    return (
      <div className="space-y-5">
        <OwnerBreadcrumb locale={locale} ownerName={ownerName} />

        <OwnerProfileCard owner={owner} />

        <div>
          <p className="text-[13px] font-semibold text-foreground mb-3">
            Businesses
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              ({owner.business_count})
            </span>
          </p>

          <OwnerBusinesses businesses={owner.businesses} />
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return <OwnerDetailError />;
  }
}
