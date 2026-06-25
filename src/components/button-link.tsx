import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = Parameters<typeof buttonVariants>[0];

/**
 * An anchor styled as a button. Avoids base-ui's native-button semantics that a
 * `<Button render={<a/>}>` would otherwise warn about. Uses next/link for
 * internal routes and a plain anchor for API/external URLs.
 */
export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
} & Variant &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const isInternal = href.startsWith("/") && !href.startsWith("/api");

  if (isInternal) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  );
}
