"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createLeadTimeAction,
  deleteLeadTimeAction,
  type ActionState,
} from "@/app/(app)/lead-times/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

export type LeadTimeRow = {
  id: string;
  label: string;
  value: number;
  unit: "DAY" | "WEEK" | "MONTH";
};

// Maps the stored value to a readable label so the trigger shows "Weeks", not "WEEK".
const UNIT_ITEMS = { DAY: "Days", WEEK: "Weeks", MONTH: "Months" };

export function LeadTimesManager({ leadTimes }: { leadTimes: LeadTimeRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLeadTimeAction,
    {},
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteLeadTimeAction(id);
      if (res.ok) toast.success(res.message ?? "Removed");
      else if (res.error) toast.error(res.error);
    });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a lead time</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={formAction}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="w-28 space-y-2">
              <Label htmlFor="value">Amount</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min={1}
                max={365}
                defaultValue={1}
                required
              />
            </div>
            <div className="w-36 space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select name="unit" defaultValue="WEEK" items={UNIT_ITEMS}>
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Days</SelectItem>
                  <SelectItem value="WEEK">Weeks</SelectItem>
                  <SelectItem value="MONTH">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SubmitButton>Add lead time</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your lead times</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leadTimes.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No lead times yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y">
              {leadTimes.map((lt) => (
                <li
                  key={lt.id}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    {lt.label}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => remove(lt.id)}
                    aria-label={`Delete ${lt.label}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
