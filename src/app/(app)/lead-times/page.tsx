import { requireUser } from "@/lib/auth/session";
import { listLeadTimes } from "@/lib/services/lead-times";
import { PageHeader } from "@/components/page-header";
import { LeadTimesManager } from "@/components/lead-times/lead-times-manager";

export default async function LeadTimesPage() {
  const user = await requireUser();
  const leadTimes = await listLeadTimes(user.id);

  return (
    <>
      <PageHeader
        title="Lead times"
        description="Define how far ahead you can be reminded. Pick from these on any birthday or holiday."
      />
      <LeadTimesManager
        leadTimes={leadTimes.map((lt) => ({
          id: lt.id,
          label: lt.label,
          value: lt.value,
          unit: lt.unit,
        }))}
      />
    </>
  );
}
