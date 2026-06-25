"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addIcsSourceAction,
  type ActionState,
} from "@/app/(app)/holidays/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export function AddIcsSource() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(
    addIcsSourceAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Added");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a calendar (ICS)</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="w-40 space-y-2">
            <Label htmlFor="ics-name">Name</Label>
            <Input id="ics-name" name="name" placeholder="Work calendar" />
          </div>
          <div className="min-w-64 grow space-y-2">
            <Label htmlFor="ics-url">ICS URL</Label>
            <Input
              id="ics-url"
              name="url"
              type="url"
              placeholder="https://example.com/holidays.ics"
              required
            />
          </div>
          <SubmitButton>Add calendar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
