-- CreateEnum
CREATE TYPE "LeadTimeUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "ContactSourceType" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "EventSourceType" AS ENUM ('HOLIDAY_API', 'ICS');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('OK', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultNotifyTime" TEXT NOT NULL DEFAULT '09:00',
    "pushoverUserKey" TEXT,
    "pushoverDevice" TEXT,
    "pushoverVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ContactSourceType" NOT NULL DEFAULT 'GOOGLE',
    "externalAccountId" TEXT NOT NULL,
    "accountEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "syncToken" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'OK',
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactSourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "birthdayMonth" INTEGER NOT NULL,
    "birthdayDay" INTEGER NOT NULL,
    "birthdayYear" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EventSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "SourceStatus" NOT NULL DEFAULT 'OK',
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventSourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER,
    "recurringAnnually" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "unit" "LeadTimeUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "eventId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sendDayOf" BOOLEAN NOT NULL DEFAULT false,
    "dayOfTimeOverride" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionLeadTime" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "leadTimeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionLeadTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "leadTimeId" TEXT,
    "occurrenceDate" DATE NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "pushoverReceipt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ContactSource_userId_idx" ON "ContactSource"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSource_userId_type_externalAccountId_key" ON "ContactSource"("userId", "type", "externalAccountId");

-- CreateIndex
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_contactSourceId_externalId_key" ON "Contact"("contactSourceId", "externalId");

-- CreateIndex
CREATE INDEX "EventSource_userId_idx" ON "EventSource"("userId");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventSourceId_externalId_key" ON "Event"("eventSourceId", "externalId");

-- CreateIndex
CREATE INDEX "LeadTime_userId_idx" ON "LeadTime"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadTime_userId_label_key" ON "LeadTime"("userId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_contactId_key" ON "Subscription"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_eventId_key" ON "Subscription"("eventId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionLeadTime_subscriptionId_idx" ON "SubscriptionLeadTime"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionLeadTime_subscriptionId_leadTimeId_key" ON "SubscriptionLeadTime"("subscriptionId", "leadTimeId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledNotification_dedupeKey_key" ON "ScheduledNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "ScheduledNotification_status_scheduledFor_idx" ON "ScheduledNotification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledNotification_userId_idx" ON "ScheduledNotification"("userId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_subscriptionId_idx" ON "ScheduledNotification"("subscriptionId");

-- AddForeignKey
ALTER TABLE "ContactSource" ADD CONSTRAINT "ContactSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactSourceId_fkey" FOREIGN KEY ("contactSourceId") REFERENCES "ContactSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSource" ADD CONSTRAINT "EventSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_eventSourceId_fkey" FOREIGN KEY ("eventSourceId") REFERENCES "EventSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTime" ADD CONSTRAINT "LeadTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionLeadTime" ADD CONSTRAINT "SubscriptionLeadTime_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionLeadTime" ADD CONSTRAINT "SubscriptionLeadTime_leadTimeId_fkey" FOREIGN KEY ("leadTimeId") REFERENCES "LeadTime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
