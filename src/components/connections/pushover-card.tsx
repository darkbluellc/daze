"use client";

import { useActionState, useEffect, useTransition } from "react";
import { BellRing, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  connectPushoverAction,
  sendTestPushAction,
  disconnectPushoverAction,
  type ActionState,
} from "@/app/(app)/connections/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export function PushoverCard({
  connected,
  device,
  configured,
}: {
  connected: boolean;
  device: string | null;
  configured: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    connectPushoverAction,
    {},
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Saved");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const runAction = (fn: () => Promise<ActionState>) =>
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
              <BellRing className="size-5" />
            </span>
            <div>
              <CardTitle>Pushover</CardTitle>
              <CardDescription>Where your reminders are delivered.</CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge className="gap-1" variant="secondary">
              <CheckCircle2 className="size-3.5" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!configured && (
          <p className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            This Daze instance has no Pushover application token configured. Ask the
            administrator to set <code>DAZE_PUSHOVER_APP_TOKEN</code>.
          </p>
        )}

        {connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your Pushover key is saved{device ? ` (device: ${device})` : ""}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => runAction(sendTestPushAction)}
              >
                <Send className="size-4" /> Send test
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => runAction(disconnectPushoverAction)}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userKey">User key</Label>
              <Input
                id="userKey"
                name="userKey"
                placeholder="u1a2b3c4d5…"
                autoComplete="off"
                required
                disabled={!configured}
              />
              <p className="text-xs text-muted-foreground">
                Find it on your{" "}
                <a
                  href="https://pushover.net"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Pushover dashboard
                </a>
                .
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device">Device (optional)</Label>
              <Input
                id="device"
                name="device"
                placeholder="Leave blank for all devices"
                autoComplete="off"
                disabled={!configured}
              />
            </div>
            <SubmitButton disabled={!configured}>Connect &amp; verify</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
