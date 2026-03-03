-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT,
    "phone_number" TEXT,
    "password_hash" TEXT,
    "business_name" TEXT,
    "trade_license_number" TEXT,
    "branch_address" TEXT,
    "owner_name" TEXT,
    "registration_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "branches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    "occupancy_rate" REAL NOT NULL DEFAULT 0,
    "access_map_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "vendor_services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "price_per_hour" DECIMAL,
    "price_per_day" DECIMAL,
    "price_per_week" DECIMAL,
    "price_per_month" DECIMAL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "available_capacity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "vendor_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_services_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_images_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vendor_service_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_service_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_service_images_vendor_service_id_fkey" FOREIGN KEY ("vendor_service_id") REFERENCES "vendor_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "availability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_service_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "availability_vendor_service_id_fkey" FOREIGN KEY ("vendor_service_id") REFERENCES "vendor_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "vendor_service_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "booking_date" DATETIME NOT NULL,
    "start_time" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "num_people" INTEGER NOT NULL,
    "total_price" DECIMAL NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "booking_status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_vendor_service_id_fkey" FOREIGN KEY ("vendor_service_id") REFERENCES "vendor_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" TEXT NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "service_id" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload_hash" TEXT,
    "rejection_reason" TEXT,
    "reviewed_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "approval_requests_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "phone_number" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "branch_facilities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_id" INTEGER NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    CONSTRAINT "branch_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "branch_facilities_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "features" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_features" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendor_service_id" INTEGER NOT NULL,
    "feature_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "service_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_features_vendor_service_id_fkey" FOREIGN KEY ("vendor_service_id") REFERENCES "vendor_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversation_id" INTEGER NOT NULL,
    "sender_type" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email_hash" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "event" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "branches_vendor_id_idx" ON "branches"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE INDEX "vendor_services_service_id_idx" ON "vendor_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_services_branch_id_service_id_key" ON "vendor_services"("branch_id", "service_id");

-- CreateIndex
CREATE INDEX "service_images_service_id_idx" ON "service_images"("service_id");

-- CreateIndex
CREATE INDEX "vendor_service_images_vendor_service_id_idx" ON "vendor_service_images"("vendor_service_id");

-- CreateIndex
CREATE INDEX "availability_vendor_service_id_date_idx" ON "availability"("vendor_service_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_vendor_service_id_idx" ON "bookings"("vendor_service_id");

-- CreateIndex
CREATE INDEX "bookings_booking_date_idx" ON "bookings"("booking_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "approval_requests_vendor_id_status_idx" ON "approval_requests"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "otp_sessions_phone_number_expires_at_idx" ON "otp_sessions"("phone_number", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

-- CreateIndex
CREATE INDEX "branch_facilities_branch_id_idx" ON "branch_facilities"("branch_id");

-- CreateIndex
CREATE INDEX "branch_facilities_facility_id_idx" ON "branch_facilities"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_facilities_branch_id_facility_id_key" ON "branch_facilities"("branch_id", "facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "features_name_key" ON "features"("name");

-- CreateIndex
CREATE INDEX "service_features_vendor_service_id_idx" ON "service_features"("vendor_service_id");

-- CreateIndex
CREATE INDEX "service_features_feature_id_idx" ON "service_features"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_features_vendor_service_id_feature_id_key" ON "service_features"("vendor_service_id", "feature_id");

-- CreateIndex
CREATE INDEX "conversations_customer_id_idx" ON "conversations"("customer_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "security_events_email_hash_event_created_at_idx" ON "security_events"("email_hash", "event", "created_at");
