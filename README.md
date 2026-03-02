# AT Spaces - Backend & Database

This repository contains the database schema and backend configuration for the **AT Spaces** project.

## 🚀 Database Overview
The project uses **Supabase** (PostgreSQL) as the primary database, with **Prisma** as the ORM.

- **Project ID**: `nxyomchuuuaqatcjllov`
- **Region**: `eu-central-1`
- **Total Tables**: 17 (Including Auth, Bookings, Chat, and Services)
- **Security**: Row Level Security (RLS) is strictly enabled on all tables.

## 🛠️ Setup Instructions for Backend Developers

### 1. Prerequisites
- Node.js (v18+)
- npm / yarn
- Prisma CLI (`npm install -g prisma`)

### 2. Environment Variables
Create a `.env` file in the root directory and add the following (see `.env.example` for details):

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.nxyomchuuuaqatcjllov.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.nxyomchuuuaqatcjllov.supabase.co:5432/postgres"
SUPABASE_URL="https://nxyomchuuuaqatcjllov.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```
> [!IMPORTANT]
> Change `[YOUR-PASSWORD]` to the database password.

### 3. Initialize Prisma
Once your `.env` is configured, run the following commands to pick up the schema:

```bash
# Install dependencies
npm install

# Pull the current schema from the database
npx prisma db pull

# Generate the Prisma client
npx prisma generate
```

## 📊 Schema Highlights
- **Role-Based Access**: Specialized roles for `CUSTOMER`, `VENDOR`, and `ADMIN`.
- **Chat System**: Includes `conversations` and `messages` for AI / Support interaction.
- **Workflow**: Automated `approval_requests` for branch and service management.
- **Security**: Granular RLS policies protect user privacy and vendor ownership.

---
**Maintained by**: Mustafa & Omar
