import { requireUser } from "@/lib/auth/session";
import { listTimezones } from "@/lib/timezone";
import { PageHeader } from "@/components/page-header";
import { AccountForm } from "@/components/settings/account-form";
import { PasswordForm } from "@/components/settings/password-form";

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
