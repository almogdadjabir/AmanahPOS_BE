import PageTitle from "@/components/ds/PageTitle";
import CreateOwnerButton from "./CreateOwnerButton";

export default function OwnersPageHeader() {
  return (
    <div className="flex items-start justify-between mb-5">
      <PageTitle
        title="Owners"
        description="All business owners registered on the platform."
      />

      <CreateOwnerButton />
    </div>
  );
}
