import Link from "next/link";
import { Gift } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-heading text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Gift className="size-5" />
          </span>
          Daze
        </Link>
        {children}
      </div>
    </div>
  );
}
