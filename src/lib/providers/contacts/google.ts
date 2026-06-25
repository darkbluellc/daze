import { google, type people_v1 } from "googleapis";

import { createOAuthClient } from "@/lib/google/oauth";
import type {
  ContactDelta,
  ContactProvider,
  NormalizedContact,
} from "./types";

const PERSON_FIELDS = "names,birthdays,metadata";

/** True when the People API rejected our syncToken (must do a full resync). */
function isExpiredSyncToken(err: unknown): boolean {
  const code = (err as { code?: number; status?: number })?.code;
  return code === 410;
}

function pickBirthday(
  person: people_v1.Schema$Person,
): { month: number; day: number; year: number | null } | null {
  for (const b of person.birthdays ?? []) {
    const d = b.date;
    if (d?.month && d?.day) {
      return { month: d.month, day: d.day, year: d.year ?? null };
    }
  }
  return null;
}

function normalize(person: people_v1.Schema$Person): NormalizedContact | null {
  const birthday = pickBirthday(person);
  if (!birthday) return null; // only birthday-bearing contacts are notifiable

  const name = person.names?.[0];
  const displayName =
    name?.displayName ??
    [name?.givenName, name?.familyName].filter(Boolean).join(" ") ??
    "Unknown";

  return {
    externalId: person.resourceName ?? "",
    displayName: displayName || "Unknown",
    givenName: name?.givenName ?? null,
    familyName: name?.familyName ?? null,
    birthdayMonth: birthday.month,
    birthdayDay: birthday.day,
    birthdayYear: birthday.year,
    raw: person,
  };
}

export class GoogleContactProvider implements ContactProvider {
  async sync(input: {
    accessToken: string;
    syncToken?: string | null;
  }): Promise<ContactDelta> {
    const auth = createOAuthClient();
    auth.setCredentials({ access_token: input.accessToken });
    const people = google.people({ version: "v1", auth });

    const upserts: NormalizedContact[] = [];
    const deletedExternalIds: string[] = [];
    let nextSyncToken: string | null | undefined;
    let pageToken: string | undefined;
    let useSyncToken = input.syncToken ?? undefined;

    do {
      let res;
      try {
        res = await people.people.connections.list({
          resourceName: "people/me",
          personFields: PERSON_FIELDS,
          pageSize: 1000,
          requestSyncToken: true,
          syncToken: useSyncToken,
          pageToken,
        });
      } catch (err) {
        // Stale token → restart a full sync from scratch.
        if (isExpiredSyncToken(err) && useSyncToken) {
          useSyncToken = undefined;
          pageToken = undefined;
          upserts.length = 0;
          deletedExternalIds.length = 0;
          continue;
        }
        throw err;
      }

      for (const person of res.data.connections ?? []) {
        if (person.metadata?.deleted) {
          if (person.resourceName) deletedExternalIds.push(person.resourceName);
          continue;
        }
        const normalized = normalize(person);
        if (normalized?.externalId) upserts.push(normalized);
      }

      pageToken = res.data.nextPageToken ?? undefined;
      nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);

    return { upserts, deletedExternalIds, nextSyncToken };
  }
}
