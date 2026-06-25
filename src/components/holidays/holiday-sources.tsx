"use client";

import { useTransition } from "react";
import { RefreshCw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  syncEventSourceNowAction,
  removeEventSourceAction,
  type ActionState,
} from "@/app/(app)/holidays/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SubscriptionConfigDialog,
  type LeadTimeOption,
  type SubscriptionConfig,
} from "@/components/subscriptions/subscription-config-dialog";

export type HolidayEventRow = {
  title: string;
  occLabel: string;
  config: SubscriptionConfig;
};

export type HolidaySourceCard = {
  id: string;
  name: string;
  lastSyncedAt: string | null;
  events: HolidayEventRow[];
};

export function HolidaySources({
  sources,
  leadTimes,
  defaultNotifyTime,
  canSendTest,
}: {
  sources: HolidaySourceCard[];
  leadTimes: LeadTimeOption[];
  defaultNotifyTime: string;
  canSendTest: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionState>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else if (res.error) toast.error(res.error);
    });

  return (
    <div className="grid gap-6">
      {sources.map((src) => (
        <Card key={src.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{src.name}</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => syncEventSourceNowAction(src.id))}
                >
                  <RefreshCw className="size-4" /> Sync
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() => run(() => removeEventSourceAction(src.id))}
                  aria-label="Remove source"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {src.events.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No upcoming holidays.
              </p>
            ) : (
              <div className="divide-y">
                {src.events.map((e) => (
                  <div
                    key={e.config.id}
                    className="flex items-center justify-between gap-4 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-sm text-muted-foreground">{e.occLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={e.config.enabled ? "secondary" : "outline"}>
                        {e.config.enabled ? "On" : "Off"}
                      </Badge>
                      <SubscriptionConfigDialog
                        itemName={e.title}
                        kind="holiday"
                        config={e.config}
                        leadTimes={leadTimes}
                        defaultNotifyTime={defaultNotifyTime}
                        canSendTest={canSendTest}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Settings2 className="size-4" /> Configure
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
