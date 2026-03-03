-- AlterTable
ALTER TABLE "approval_requests" ADD COLUMN "payload" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "price_change_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_id" INTEGER NOT NULL,
    "vendor_service_id" INTEGER NOT NULL,
    "oldPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "audit_logs_vendor_id_idx" ON "audit_logs"("vendor_id");

-- CreateIndex
CREATE INDEX "price_change_logs_vendor_service_id_idx" ON "price_change_logs"("vendor_service_id");
