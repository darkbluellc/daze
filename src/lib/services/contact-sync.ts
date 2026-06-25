import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { ensureAccessToken } from "@/lib/google/oauth";
import { GoogleContactProvider } from "@/lib/providers/contacts/google";
import type { ContactProvider } from "@/lib/providers/contacts/types";

export type SyncSummary = {
  created: number;
  updated: number;
  deleted: number;
  newBirthdays: number;
};

function providerFor(type: string): ContactProvider {
  switch (type) {
    case "GOOGLE":
      return new GoogleContactProvider();
    default:
      throw new Error(`Unsupported contact source type: ${type}`);
  }
}

/**
 * Pull the latest contacts for a source, upsert them, prune deletions, and
 * create unconfigured (default-off) subscriptions for any new birthdays.
 */
export async function syncContactSource(sourceId: string): Promise<SyncSummary> {
  const source = await prisma.contactSource.findUniqueOrThrow({
    where: { id: sourceId },
  });

  try {
    // Refresh the access token if needed, then persist any rotation.
    const tokens = await ensureAccessToken({
      accessToken: source.accessToken ? decrypt(source.accessToken) : null,
      refreshToken: source.refreshToken ? decrypt(source.refreshToken) : null,
      expiryDate: source.tokenExpiresAt?.getTime() ?? null,
    });

    await prisma.contactSource.update({
      where: { id: source.id },
      data: {
        accessToken: tokens.accessToken ? encrypt(tokens.accessToken) : null,
        refreshToken: tokens.refreshToken
          ? encrypt(tokens.refreshToken)
          : source.refreshToken,
        tokenExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
      },
    });

    const provider = providerFor(source.type);
    const delta = await provider.sync({
      accessToken: tokens.accessToken,
      syncToken: source.syncToken,
    });

    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      deleted: 0,
      newBirthdays: 0,
    };

    for (const c of delta.upserts) {
      const existing = await prisma.contact.findUnique({
        where: {
          contactSourceId_externalId: {
            contactSourceId: source.id,
            externalId: c.externalId,
          },
        },
        select: { id: true },
      });

      const contact = await prisma.contact.upsert({
        where: {
          contactSourceId_externalId: {
            contactSourceId: source.id,
            externalId: c.externalId,
          },
        },
        create: {
          userId: source.userId,
          contactSourceId: source.id,
          externalId: c.externalId,
          displayName: c.displayName,
          givenName: c.givenName ?? null,
          familyName: c.familyName ?? null,
          birthdayMonth: c.birthdayMonth,
          birthdayDay: c.birthdayDay,
          birthdayYear: c.birthdayYear ?? null,
          raw: c.raw as object,
        },
        update: {
          displayName: c.displayName,
          givenName: c.givenName ?? null,
          familyName: c.familyName ?? null,
          birthdayMonth: c.birthdayMonth,
          birthdayDay: c.birthdayDay,
          birthdayYear: c.birthdayYear ?? null,
          raw: c.raw as object,
        },
      });

      if (existing) summary.updated += 1;
      else summary.created += 1;

      // Ensure a default-off subscription exists for this birthday. A freshly
      // created, unacknowledged subscription counts as a "new birthday".
      const sub = await prisma.subscription.findUnique({
        where: { contactId: contact.id },
        select: { id: true },
      });
      if (!sub) {
        await prisma.subscription.create({
          data: { userId: source.userId, contactId: contact.id },
        });
        summary.newBirthdays += 1;
      }
    }

    if (delta.deletedExternalIds.length > 0) {
      const res = await prisma.contact.deleteMany({
        where: {
          contactSourceId: source.id,
          externalId: { in: delta.deletedExternalIds },
        },
      });
      summary.deleted = res.count;
    }

    await prisma.contactSource.update({
      where: { id: source.id },
      data: {
        syncToken: delta.nextSyncToken ?? source.syncToken,
        lastSyncedAt: new Date(),
        status: "OK",
        lastError: null,
      },
    });

    return summary;
  } catch (err) {
    await prisma.contactSource.update({
      where: { id: source.id },
      data: {
        status: "ERROR",
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
