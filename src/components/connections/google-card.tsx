"use client";

import { useTransition } from "react";
import { Contact2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  syncGoogleNowAction,
  disconnectGoogleAction,
  type ActionState,
} from "@/app/(app)/connections/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type GoogleSource = {
  id: string;
  accountEmail: string | null;
  contactCount: number;
  status: string;
  lastSyncedAt: string | null;
};

export function GoogleCard({
  configured,
  sources,
}: {
  configured: boolean;
  sources: GoogleSource[];
}) {
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionState>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else if (res.error) toast.error(res.error);
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Contact2 className="size-5" />
            </span>
            <div>
              <CardTitle>Google Contacts</CardTitle>
              <CardDescription>Import birthdays from your contacts.</CardDescription>
            </div>
          </div>
          <Badge variant={sources.length ? "secondary" : "outline"}>
            {sources.length ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Google OAuth is not configured on this instance. Set{" "}
            <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>.
          </p>
        )}

        {sources.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {s.accountEmail ?? "Google account"}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.contactCount} birthday{s.contactCount === 1 ? "" : "s"}
                {s.lastSyncedAt
                  ? ` · synced ${new Date(s.lastSyncedAt).toLocaleString()}`
                  : ""}
                {s.status === "ERROR" ? " · sync error" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => run(() => syncGoogleNowAction(s.id))}
              >
                <RefreshCw className="size-4" /> Sync now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => run(() => disconnectGoogleAction(s.id))}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ))}

        {configured && (
          <ButtonLink
            variant={sources.length ? "outline" : "default"}
            href="/api/connections/google/start"
          >
            {sources.length ? "Connect another account" : "Connect Google"}
          </ButtonLink>
        )}
      </CardContent>
    </Card>
  );
}
