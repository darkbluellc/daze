"use client";

import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  SubscriptionConfigDialog,
  type LeadTimeOption,
  type SubscriptionConfig,
} from "@/components/subscriptions/subscription-config-dialog";

export type BirthdayRow = {
  name: string;
  occLabel: string;
  config: SubscriptionConfig;
};

function summarize(config: SubscriptionConfig): string {
  if (!config.enabled) return "Off";
  const parts: string[] = [];
  if (config.sendDayOf) parts.push("day-of");
  if (config.selectedLeadTimeIds.length) {
    parts.push(`${config.selectedLeadTimeIds.length} ahead`);
  }
  return parts.length ? `On · ${parts.join(" + ")}` : "On";
}

export function BirthdaysList({
  rows,
  leadTimes,
  defaultNotifyTime,
}: {
  rows: BirthdayRow[];
  leadTimes: LeadTimeOption[];
  defaultNotifyTime: string;
}) {
  return (
    <Card>
      <CardContent className="divide-y p-0">
        {rows.map((r) => (
          <div
            key={r.config.id}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{r.name}</p>
              <p className="text-sm text-muted-foreground">{r.occLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={r.config.enabled ? "secondary" : "outline"}>
                {summarize(r.config)}
              </Badge>
              <SubscriptionConfigDialog
                itemName={r.name}
                kind="birthday"
                config={r.config}
                leadTimes={leadTimes}
                defaultNotifyTime={defaultNotifyTime}
                trigger={
                  <Button size="sm" variant="outline">
                    <Settings2 className="size-4" /> Configure
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
