"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Summons the onboarding/review prompt (rendered once in the app layout) via a
// window event, so it can live anywhere in the tree.
export function ReviewBirthdaysButton({
  count,
  variant = "outline",
}: {
  count: number;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      variant={variant}
      onClick={() =>
        window.dispatchEvent(new CustomEvent("daze:review-birthdays"))
      }
    >
      <Sparkles className="size-4" />
      Review new birthdays
      {count > 0 && (
        <Badge variant="secondary" className="ml-1">
          {count}
        </Badge>
      )}
    </Button>
  );
}
