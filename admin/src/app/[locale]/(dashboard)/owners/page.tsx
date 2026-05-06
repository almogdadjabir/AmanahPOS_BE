import { Suspense } from "react";
import { TableSkeleton } from "@/components/ds/Skeleton";

import OwnersTable from "./_components/OwnersTable";
import OwnersControls from "./_components/OwnersControls";
import OwnersDrawerShell from "./_components/OwnersDrawerShell";
import OwnersPageHeader from "./_components/OwnersPageHeader";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sub?: string;
    page?: string;
  }>;
}

export default async function OwnersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const tableKey = JSON.stringify({
    search: params.search,
    status: params.status,
    sub: params.sub,
    page: params.page,
  });

  return (
    <OwnersDrawerShell>
      <div>
        <OwnersPageHeader />

        <Suspense
          fallback={
            <div className="h-14 rounded-xl bg-muted animate-pulse mb-5" />
          }
        >
          <OwnersControls />
        </Suspense>

        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
          <OwnersTable
            search={params.search}
            status={params.status}
            sub={params.sub}
            page={page}
          />
        </Suspense>
      </div>
    </OwnersDrawerShell>
  );
}
