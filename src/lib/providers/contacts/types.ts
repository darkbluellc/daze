// Pluggable contact-source abstraction. Google is the first implementation;
// future hosts (CardDAV, Microsoft, …) implement the same interface.

export type NormalizedContact = {
  /** Stable per-source id (e.g. Google resourceName). */
  externalId: string;
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  /** Birthday is required for a contact to be notifiable. */
  birthdayMonth: number;
  birthdayDay: number;
  birthdayYear?: number | null;
  raw?: unknown;
};

export type ContactDelta = {
  /** Contacts to upsert (created or updated). */
  upserts: NormalizedContact[];
  /** externalIds removed at the source since the last sync. */
  deletedExternalIds: string[];
  /** Opaque token to persist for the next incremental sync. */
  nextSyncToken?: string | null;
  /** Identity of the connected account (set on first sync). */
  account?: { externalAccountId: string; email?: string | null };
};

export interface ContactProvider {
  /** Pull changes since `syncToken` (or everything when null/invalid). */
  sync(input: {
    accessToken: string;
    syncToken?: string | null;
  }): Promise<ContactDelta>;
}
