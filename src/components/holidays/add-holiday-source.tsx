"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  addHolidaySourceAction,
  type ActionState,
} from "@/app/(app)/holidays/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

export type Country = { countryCode: string; name: string };

export function AddHolidaySource({ countries }: { countries: Country[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addHolidaySourceAction,
    {},
  );
  const [code, setCode] = useState("");

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Added");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const selectedName = countries.find((c) => c.countryCode === code)?.name ?? "";
  // Lets the trigger show the country name rather than its code.
  const countryItems = Object.fromEntries(
    countries.map((c) => [c.countryCode, c.name]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add public holidays</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="countryCode" value={code} />
          <input type="hidden" name="countryName" value={selectedName} />
          <div className="min-w-56 grow space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={code}
              onValueChange={(v) => setCode(v ?? "")}
              items={countryItems}
            >
              <SelectTrigger id="country" className="w-full">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {countries.map((c) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SubmitButton disabled={!code}>Add holidays</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
