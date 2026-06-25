// Pluggable event-source abstraction. Holiday API is the first implementation;
// ICS calendars implement the same interface later.

export type NormalizedEvent = {
  /** Stable per-source id. */
  externalId: string;
  title: string;
  month: number;
  day: number;
  /** Concrete year for dated events; null for annually recurring ones. */
  year?: number | null;
  recurringAnnually: boolean;
  raw?: unknown;
};

export type EventDelta = {
  upserts: NormalizedEvent[];
  deletedExternalIds: string[];
};

export interface EventProvider {
  /** Pull events for a source. `config` is the source's stored JSON config. */
  sync(config: unknown): Promise<EventDelta>;
}
