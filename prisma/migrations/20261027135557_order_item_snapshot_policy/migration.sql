-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "downloadLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "expiryDays" INTEGER NOT NULL DEFAULT 365;
