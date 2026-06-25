"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cake, Sparkles } from "lucide-react";

import { toast } from "sonner";
import { BellRing } from "lucide-react";

import {
  acknowledgeSubscriptionAction,
  quickEnableSubscriptionAction,
} from "@/app/(app)/subscriptions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SubscriptionConfigDialog,
  type LeadTimeOption,
} from "@/components/subscriptions/subscription-config-dialog";

export type OnboardingItem = {
  subscriptionId: string;
  name: string;
  occLabel: string;
};

export function OnboardingPrompt({
  items: initialItems,
  leadTimes,
  defaultNotifyTime,
}: {
  items: OnboardingItem[];
  leadTimes: LeadTimeOption[];
  defaultNotifyTime: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialItems.length > 0);
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  const remove = (subscriptionId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.subscriptionId !== subscriptionId);
      if (next.length === 0) {
        setOpen(false);
        router.refresh();
      }
      return next;
    });
  };

  const skip = (subscriptionId: string) =>
    startTransition(async () => {
      await acknowledgeSubscriptionAction(subscriptionId);
      remove(subscriptionId);
    });

  const turnOn = (subscriptionId: string) =>
    startTransition(async () => {
      const res = await quickEnableSubscriptionAction(subscriptionId);
      if (res.ok) {
        toast.success("Day-of reminder turned on.");
        remove(subscriptionId);
      } else {
        toast.error(res.error ?? "Could not enable.");
      }
    });

  const skipAll = () =>
    startTransition(async () => {
      await Promise.all(
        items.map((i) => acknowledgeSubscriptionAction(i.subscriptionId)),
      );
      setItems([]);
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {items.length} new birthday{items.length === 1 ? "" : "s"} found
          </DialogTitle>
          <DialogDescription>
            New birthdays start off. Turn on a one-tap day-of reminder, customize,
            or skip — your call.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-80 divide-y overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.subscriptionId}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Cake className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.occLabel}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => turnOn(item.subscriptionId)}
                >
                  <BellRing className="size-4" /> Turn on
                </Button>
                <SubscriptionConfigDialog
                  itemName={item.name}
                  kind="birthday"
                  config={{
                    id: item.subscriptionId,
                    enabled: true,
                    sendDayOf: true,
                    dayOfTimeOverride: null,
                    selectedLeadTimeIds: [],
                  }}
                  leadTimes={leadTimes}
                  defaultNotifyTime={defaultNotifyTime}
                  onSaved={() => remove(item.subscriptionId)}
                  trigger={
                    <Button size="sm" variant="outline">
                      Customize
                    </Button>
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => skip(item.subscriptionId)}
                >
                  Skip
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={skipAll} disabled={isPending}>
            Skip all for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
