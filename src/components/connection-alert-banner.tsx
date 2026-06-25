import { AlertTriangle } from "lucide-react";

import { ButtonLink } from "@/components/button-link";

export type BrokenSource = { id: string; label: string };

export function ConnectionAlertBanner({ sources }: { sources: BrokenSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <p className="text-sm text-foreground">
          {sources.length === 1
            ? `Daze can't reach ${sources[0].label}. Reconnect to keep reminders flowing.`
            : `${sources.length} connections need reconnecting.`}
        </p>
        <ButtonLink size="sm" variant="outline" href="/connections" className="ml-auto">
          Reconnect
        </ButtonLink>
      </div>
    </div>
  );
}
