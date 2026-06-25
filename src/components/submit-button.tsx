"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      className={cn(className)}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
