"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  changePasswordAction,
  type FormState,
} from "@/app/(app)/settings/actions";
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
import { SubmitButton } from "@/components/submit-button";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<FormState, FormData>(
    changePasswordAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Password updated");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <form action={formAction} ref={formRef}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <SubmitButton>Update password</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
