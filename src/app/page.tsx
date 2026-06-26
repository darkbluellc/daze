import {
  ArrowRight,
  BellRing,
  Cake,
  CalendarClock,
  CalendarDays,
  Contact2,
  Gift,
  PartyPopper,
  StickyNote,
} from "lucide-react";

import { auth } from "@/auth";
import { ButtonLink } from "@/components/button-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrowserFrame } from "@/components/marketing/browser-frame";

function FeatureRow({
  flip,
  eyebrow,
  title,
  children,
  shot,
  alt,
}: {
  flip?: boolean;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  shot: string;
  alt: string;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h3>
        <div className="mt-4 space-y-3 text-muted-foreground">{children}</div>
      </div>
      <BrowserFrame shot={shot} alt={alt} className={flip ? "lg:order-1" : ""} />
    </div>
  );
}

export default async function LandingPage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Gift className="size-4" />
            </span>
            Daze
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loggedIn ? (
              <ButtonLink href="/dashboard">Open app</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost">
                  Log in
                </ButtonLink>
                <ButtonLink href="/register">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -top-32 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
        />
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BellRing className="size-3.5 text-primary" />
            Birthday &amp; holiday reminders via Pushover
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold tracking-tight sm:text-6xl">
            Never miss a birthday again.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Daze quietly watches your contacts and the calendar, then nudges you
            on Pushover—day-of or as far ahead as you like—so you always show
            up on time for the people who matter.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <ButtonLink href={loggedIn ? "/dashboard" : "/register"} size="lg">
              {loggedIn ? "Open the app" : "Get started—it's free"}
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="#features" variant="outline" size="lg">
              See how it works
            </ButtonLink>
          </div>

          {/* Quick capability chips */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Contact2 className="size-4" /> Google Contacts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PartyPopper className="size-4" /> Public holidays
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" /> ICS calendars
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StickyNote className="size-4" /> Notes &amp; lead times
            </span>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <BrowserFrame shot="dashboard" alt="The Daze dashboard" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl space-y-24 px-4 py-20 sm:px-6">
        <FeatureRow
          eyebrow="Your reminders, your rules"
          title="Decide exactly when each reminder lands"
          shot="config"
          alt="Configuring a birthday reminder"
        >
          <p>
            Get a nudge on the day at a time you choose—and as many lead times
            ahead as you want: a day, a week, a month. Mix and match per person.
          </p>
          <p>
            Jot a <span className="text-foreground">note</span> (gift ideas, ring
            size, anything) and Daze tucks it right into the reminder so you
            remember the details when it counts.
          </p>
        </FeatureRow>

        <FeatureRow
          flip
          eyebrow="Always know what's next"
          title="Everything coming up, at a glance"
          shot="upcoming"
          alt="The upcoming reminders timeline"
        >
          <p>
            A clean timeline of every reminder Daze is about to send, grouped by
            day and shown in your timezone.
          </p>
          <p>
            Several reminders on the same day?{" "}
            <span className="text-foreground">They arrive as one tidy push</span>{" "}
            — no notification spam.
          </p>
        </FeatureRow>

        <FeatureRow
          eyebrow="From sources you already use"
          title="Birthdays and holidays, automatically"
          shot="holidays"
          alt="Holiday sources in Daze"
        >
          <p>
            Connect Google Contacts and Daze imports every birthday. New ones
            always start <span className="text-foreground">off</span>—you decide
            who&apos;s worth a reminder, never the other way around.
          </p>
          <p>
            Add public holidays for your country, or subscribe to any ICS
            calendar, and treat those just like birthdays.
          </p>
        </FeatureRow>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-heading text-3xl font-bold tracking-tight">
            Up and running in minutes
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: BellRing,
                title: "Connect",
                body: "Link Google Contacts and your Pushover key. Your tokens are encrypted at rest.",
              },
              {
                icon: Cake,
                title: "Choose who & when",
                body: "Flip on the people and dates you care about, and pick day-of and lead times.",
              },
              {
                icon: CalendarClock,
                title: "Get a gentle nudge",
                body: "Daze sends the right reminder at the right time—with your notes attached.",
              },
            ].map((step, i) => (
              <div key={step.title} className="rounded-xl border bg-card p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-heading font-bold">
                  <span className="text-primary">{i + 1}.</span> {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Show up for the people who matter.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Set it up once and let Daze remember every birthday and holiday for you.
        </p>
        <div className="mt-8">
          <ButtonLink href={loggedIn ? "/dashboard" : "/register"} size="lg">
            {loggedIn ? "Open the app" : "Get started"}
            <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gift className="size-3.5" />
            </span>
            Daze
          </span>
          <div className="flex items-center gap-4">
            <a href="/login" className="hover:text-foreground">
              Log in
            </a>
            <a href="/register" className="hover:text-foreground">
              Create account
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
