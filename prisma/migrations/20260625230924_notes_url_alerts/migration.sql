-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "ContactSource" ADD COLUMN     "alertSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ScheduledNotification" ADD COLUMN     "url" TEXT;
