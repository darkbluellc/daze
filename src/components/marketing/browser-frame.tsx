/* eslint-disable @next/next/no-img-element */

// A screenshot in subtle browser chrome. Shows the light or dark capture to
// match the current theme (next-themes toggles the `dark` class on <html>).
export function BrowserFrame({
  shot,
  alt,
  className,
}: {
  shot: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={
        "overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/10 " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-red-400/70" />
        <span className="size-3 rounded-full bg-yellow-400/70" />
        <span className="size-3 rounded-full bg-green-400/70" />
      </div>
      <img
        src={`/screenshots/${shot}-light.png`}
        alt={alt}
        loading="lazy"
        className="block w-full dark:hidden"
      />
      <img
        src={`/screenshots/${shot}-dark.png`}
        alt={alt}
        loading="lazy"
        className="hidden w-full dark:block"
      />
    </div>
  );
}
