// Dev seed. Creates a demo user with lead times plus a sample (manual) contact
// source and a few birthdays so the UI and scheduler can be exercised without a
// live Google/Pushover connection. Safe to re-run (idempotent upserts).
//
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@daze.local";
  const passwordHash = await hash("password123");

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash,
      timezone: "America/New_York",
      defaultNotifyTime: "09:00",
    },
  });

  const leadTimes: Array<{ label: string; value: number; unit: "DAY" | "WEEK" | "MONTH" }> = [
    { label: "1 day before", value: 1, unit: "DAY" },
    { label: "2 days before", value: 2, unit: "DAY" },
    { label: "1 week before", value: 1, unit: "WEEK" },
    { label: "1 month before", value: 1, unit: "MONTH" },
  ];
  for (const lt of leadTimes) {
    await prisma.leadTime.upsert({
      where: { userId_label: { userId: user.id, label: lt.label } },
      update: { value: lt.value, unit: lt.unit },
      create: { userId: user.id, ...lt },
    });
  }

  // A manual contact source standing in for a Google connection (no real tokens).
  const source = await prisma.contactSource.upsert({
    where: {
      userId_type_externalAccountId: {
        userId: user.id,
        type: "GOOGLE",
        externalAccountId: "seed-google",
      },
    },
    update: {},
    create: {
      userId: user.id,
      type: "GOOGLE",
      externalAccountId: "seed-google",
      accountEmail: "demo.contacts@gmail.com",
      status: "OK",
      lastSyncedAt: new Date(),
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const contacts = [
    {
      externalId: "people/seed-1",
      displayName: "Ada Lovelace",
      birthdayMonth: tomorrow.getMonth() + 1,
      birthdayDay: tomorrow.getDate(),
      birthdayYear: 1990,
    },
    {
      externalId: "people/seed-2",
      displayName: "Grace Hopper",
      birthdayMonth: 12,
      birthdayDay: 9,
      birthdayYear: 1906,
    },
    {
      externalId: "people/seed-3",
      displayName: "Leap Day Linus",
      birthdayMonth: 2,
      birthdayDay: 29,
      birthdayYear: 2000,
    },
  ];

  for (const c of contacts) {
    const contact = await prisma.contact.upsert({
      where: {
        contactSourceId_externalId: {
          contactSourceId: source.id,
          externalId: c.externalId,
        },
      },
      update: c,
      create: { userId: user.id, contactSourceId: source.id, ...c },
    });
    await prisma.subscription.upsert({
      where: { contactId: contact.id },
      update: {},
      create: { userId: user.id, contactId: contact.id },
    });
  }

  console.log(
    `Seeded ${email}: ${leadTimes.length} lead times, ${contacts.length} birthdays.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
