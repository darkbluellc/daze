/** True if `tz` is a valid IANA timezone the runtime understands. */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The full IANA timezone list (falls back to just UTC on old runtimes). */
export function listTimezones(): string[] {
  const fn = (Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf;
  return fn ? fn("timeZone") : ["UTC"];
}
