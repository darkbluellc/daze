import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { PageHeader } from "@/components/page-header";
import { PushoverCard } from "@/components/connections/pushover-card";
import { GoogleCard } from "@/components/connections/google-card";

export default async function ConnectionsPage() {
  const user = await requireUser();

  const sources = await prisma.contactSource.findMany({
    where: { userId: user.id, type: "GOOGLE" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <>
      <PageHeader
        title="Connections"
        description="Connect Google Contacts and your Pushover account."
      />
      <div className="grid gap-6">
        <GoogleCard
          configured={isGoogleConfigured()}
          sources={sources.map((s) => ({
            id: s.id,
            accountEmail: s.accountEmail,
            contactCount: s._count.contacts,
            status: s.status,
            lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
          }))}
        />
        <PushoverCard
          connected={Boolean(user.pushoverUserKey)}
          device={user.pushoverDevice}
          configured={Boolean(env.pushoverAppToken)}
        />
      </div>
    </>
  );
}
