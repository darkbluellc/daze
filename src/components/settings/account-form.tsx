"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateAccountAction, type FormState } from "@/app/(app)/settings/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { SubmitButton } from "@/components/submit-button";

export function AccountForm({
  defaultName,
  defaultTimezone,
  defaultNotifyTime,
  timezones,
}: {
  defaultName: string;
  defaultTimezone: string;
  defaultNotifyTime: string;
  timezones: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateAccountAction,
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Saved");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Your name, timezone, and the default time of day notifications are sent.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={defaultName} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <SearchableSelect
                id="timezone"
                name="timezone"
                defaultValue={defaultTimezone}
                options={timezones.map((tz) => ({ value: tz, label: tz }))}
                placeholder="Search timezones…"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultNotifyTime">Default notify time</Label>
              <Input
                id="defaultNotifyTime"
                name="defaultNotifyTime"
                type="time"
                defaultValue={defaultNotifyTime}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <SubmitButton>Save changes</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
