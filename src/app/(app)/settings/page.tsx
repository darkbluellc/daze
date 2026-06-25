import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { AccountForm } from "@/components/settings/account-form";
import { PasswordForm } from "@/components/settings/password-form";

function listTimezones(): string[] {
  // Node 18.14+ / modern browsers expose the full IANA list.
  const fn = (Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf;
  if (fn) return fn("timeZone");
  return ["UTC"];
}

export default async function SettingsPage() {
  const user = await requireUser();
  const timezones = listTimezones();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and notification defaults."
      />
      <div className="grid gap-6">
        <AccountForm
          defaultName={user.name ?? ""}
          defaultTimezone={user.timezone}
          defaultNotifyTime={user.defaultNotifyTime}
          timezones={timezones}
        />
        <PasswordForm />
      </div>
    </>
  );
}
