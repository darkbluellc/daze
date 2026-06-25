"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  saveSubscriptionConfigAction,
  sendTestForSubscriptionAction,
} from "@/app/(app)/subscriptions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

export type LeadTimeOption = { id: string; label: string };

export type SubscriptionConfig = {
  id: string;
  enabled: boolean;
  sendDayOf: boolean;
  dayOfTimeOverride: string | null;
  selectedLeadTimeIds: string[];
  notes?: string | null;
};

export function SubscriptionConfigDialog({
  itemName,
  kind,
  config,
  leadTimes,
  defaultNotifyTime,
  canSendTest = false,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
}: {
  itemName: string;
  kind: "birthday" | "holiday";
  config: SubscriptionConfig;
  leadTimes: LeadTimeOption[];
  defaultNotifyTime: string;
  canSendTest?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const [enabled, setEnabled] = useState(config.enabled);
  const [sendDayOf, setSendDayOf] = useState(config.sendDayOf);
  const [dayOfTime, setDayOfTime] = useState(config.dayOfTimeOverride ?? "");
  const [notes, setNotes] = useState(config.notes ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(config.selectedLeadTimeIds),
  );
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();

  const toggleLead = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const res = await saveSubscriptionConfigAction(config.id, {
        enabled,
        sendDayOf,
        dayOfTimeOverride: dayOfTime,
        leadTimeIds: Array.from(selected),
        notes: kind === "birthday" ? notes : undefined,
      });
      if (res.ok) {
        toast.success(enabled ? "Reminders updated." : "Reminders turned off.");
        setOpen(false);
        onSaved?.();
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not save.");
      }
    });

  const sendTest = () =>
    startTesting(async () => {
      const res = await sendTestForSubscriptionAction(config.id);
      if (res.ok) toast.success("Test notification sent.");
      else toast.error(res.error ?? "Could not send test.");
    });

  const noLeadTimes = leadTimes.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{itemName}</DialogTitle>
          <DialogDescription>
            Choose when to be reminded about this {kind}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="font-medium">
              Enable reminders
            </Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <div className="space-y-5 border-t pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="sendDayOf" className="font-medium">
                    Notify on the day
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sent at {dayOfTime || defaultNotifyTime}.
                  </p>
                </div>
                <Switch
                  id="sendDayOf"
                  checked={sendDayOf}
                  onCheckedChange={setSendDayOf}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfTime">Send time (optional)</Label>
                <Input
                  id="dayOfTime"
                  type="time"
                  value={dayOfTime}
                  onChange={(e) => setDayOfTime(e.target.value)}
                  placeholder={defaultNotifyTime}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use your default ({defaultNotifyTime}).
                </p>
              </div>

              <div className="space-y-3">
                <Label className="font-medium">Notify ahead of time</Label>
                {noLeadTimes ? (
                  <p className="text-xs text-muted-foreground">
                    No lead times defined.{" "}
                    <a href="/lead-times" className="underline">
                      Add some
                    </a>{" "}
                    to be reminded in advance.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leadTimes.map((lt) => (
                      <label
                        key={lt.id}
                        className="flex cursor-pointer items-center gap-3 text-sm"
                      >
                        <Checkbox
                          checked={selected.has(lt.id)}
                          onCheckedChange={(c) => toggleLead(lt.id, Boolean(c))}
                        />
                        {lt.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {kind === "birthday" && (
            <div className="space-y-2 border-t pt-5">
              <Label htmlFor="notes" className="font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gift ideas, sizes, anything to remember…"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Included in the reminder so you remember the details.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {canSendTest && config.enabled ? (
            <Button
              variant="outline"
              onClick={sendTest}
              disabled={isTesting}
              className="sm:mr-auto"
            >
              {isTesting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send test
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
