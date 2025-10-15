# Database Architecture & Setup Guide

This document explains how to stand up the initial relational database for the
paybillswithus.com platform on your GoDaddy VPS, align it with the JWT-based
authentication flow, and support the user capabilities currently exposed in the
front-end prototype. It intentionally focuses on the user portal first; the
admin and agent portals will be layered on top of this foundation later.

---

## 1. Choose and install the database engine

A managed relational engine such as **PostgreSQL** gives you transactional
integrity, JSON support, and mature tooling. The examples below assume Ubuntu or
Debian on your VPS.

1. SSH into the VPS.
2. Install PostgreSQL and its contrib package:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```
3. Confirm the service is running:
   ```bash
   sudo systemctl status postgresql
   ```
4. Switch to the `postgres` user and create a dedicated database role and
   database for the app:
   ```bash
   sudo -u postgres psql
   CREATE ROLE paybills_app WITH LOGIN PASSWORD 'replace-with-strong-password';
   CREATE DATABASE paybills_prod OWNER paybills_app;
   \q
   ```
5. Harden the instance:
   * Edit `/etc/postgresql/<version>/main/postgresql.conf` to set
     `listen_addresses = 'localhost'` unless you need remote connections.
   * Restrict authentication in
     `/etc/postgresql/<version>/main/pg_hba.conf` to trusted networks.
   * Enable automatic updates and regular backups (e.g., `pg_dump` + `cron`).

> **Alternative engines** such as MySQL or MariaDB work similarly. If you prefer
> SQLite for rapid prototyping, you can reuse the schema definitions below but
> must add your own backup strategy.

---

## 2. Recommended schema (user-focused scope)

> **Live reference:** The production schema used by the running API is maintained in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). The entity-relationship diagram below remains conceptually accurate, but always defer to the Prisma schema for exact column names and enum values when applying migrations.

```mermaid
erDiagram
    users ||--o{ payment_methods : "has"
    users ||--o{ user_billers : "tracks"
    user_billers }o--|| billers : "references"
    users ||--o{ receipts : "has"

    users {
        uuid id PK
        text email
        text password_hash
        text first_name
        text last_name
        date date_of_birth
        text ssn_last4
        text phone
        text address_line1
        text address_line2
        text city
        text state
        text postal_code
        text country
        text customer_number
        timestamptz created_at
        timestamptz updated_at
        timestamptz email_verified_at
        timestamptz last_login_at
        boolean is_active
    }

    payment_methods {
        uuid id PK
        uuid user_id FK
        text type -- 'card' or 'ach'
        text brand -- for cards (e.g., Visa)
        text last4
        smallint exp_month
        smallint exp_year
        text name_on_account
        text routing_number_hash -- only for ACH
        text account_number_hash -- only for ACH
        boolean is_primary
        timestamptz created_at
        timestamptz updated_at
    }

    billers {
        uuid id PK
        text name
        text category -- internet, home, tv, electric, mobile
        text phone
        text website
        timestamptz created_at
        timestamptz updated_at
    }

    user_billers {
        uuid id PK
        uuid user_id FK
        uuid biller_id FK
        text account_number_encrypted
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    receipts {
        uuid id PK
        uuid user_id FK
        uuid user_biller_id FK
        text receipt_number
        numeric amount
        timestamptz paid_at
        text storage_url -- S3/object storage path of uploaded receipt
        timestamptz created_at
    }
```

### Key behaviors

* **Customer number generation** – Populate `customer_number` with a unique
  human-readable identifier once sign-up and identity verification succeed
  (e.g., `US-2024-000123`).
* **Payment methods** – Store only the minimum necessary details. Full card or
  bank numbers must be tokenized or encrypted via your chosen payment processor.
* **Billers & receipts** – Only agents can mutate these records. Authenticated
  users query their `user_billers` and `receipts` rows in read-only mode.
* **Soft deletion** – Use the `is_active` flag (or add `deleted_at` timestamps)
  instead of hard-deleting rows to keep an audit trail.

---

## 3. SQL migration snippets

The following SQL snippets create the core tables. Adapt types or constraints to
match your security/compliance needs.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    ssn_last4 CHAR(4) NOT NULL,
    phone TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    customer_number TEXT UNIQUE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('card', 'ach')),
    brand TEXT,
    last4 TEXT NOT NULL,
    exp_month SMALLINT,
    exp_year SMALLINT,
    name_on_account TEXT,
    routing_number_hash TEXT,
    account_number_hash TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_billers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    biller_id UUID NOT NULL REFERENCES billers(id),
    account_number_encrypted TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, biller_id)
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_biller_id UUID NOT NULL REFERENCES user_billers(id) ON DELETE CASCADE,
    receipt_number TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    storage_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_user_billers_user ON user_billers(user_id);
CREATE INDEX idx_receipts_user ON receipts(user_id);
```

> You can manage migrations through tools like Prisma Migrate, Knex, or simple
> SQL files executed by your deployment pipeline. Pick one tooling approach and
> keep migrations under version control.

---

## 4. Authentication & JWT integration

1. **Password hashing** – Hash passwords with a strong algorithm (Argon2id or
   bcrypt with cost ≥ 12) before inserting into the `users` table.
2. **Login flow** – When a user logs in, validate credentials, and if successful
   create a JWT payload that includes the `user_id`, `customer_number`, and a
   short-lived expiration (e.g., 15 minutes). Issue a refresh token stored in a
   secure HTTP-only cookie or separate table.
3. **Authorization middleware** – Every API route should verify the JWT and
   load the associated user record. Deny write operations to biller and receipt
   endpoints for standard users; reserve those for agent/admin routes.
4. **Post-auth hydration** – After successful authentication, fetch and return
   the user's payment methods, billers, and receipts via separate endpoints,
   ensuring the SQL queries filter on `user_id`.

---

## 5. API outline to support the front end

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | Create user, hash password, stage for KYC review | Generate `customer_number` after verification. |
| `/api/auth/login` | POST | Exchange credentials for JWT + refresh token | Update `last_login_at`. |
| `/api/payment-methods` | GET | List payment methods | Users can also POST, PUT, DELETE their own records. |
| `/api/payment-methods` | POST | Add new payment method | Tokenize with processor before storing. |
| `/api/payment-methods/:id` | PUT | Update method metadata | Restrict to the owner `user_id`. |
| `/api/payment-methods/:id` | DELETE | Remove method | Soft delete or mark inactive. |
| `/api/billers` | GET | Read-only list of a user's billers | Agents manage creation via separate portal. |
| `/api/receipts` | GET | Read-only list of receipts for the user | Filter by date/biller when needed. |

Agent/admin APIs will cover biller creation, receipt uploads, and customer
status updates. Keep them on separate subdomains or behind VPN as planned.

---

## 6. Operational checklist

* **Backups** – Schedule daily logical backups with `pg_dump` and retain copies
  off the VPS. Test restoring backups quarterly.
* **Monitoring** – Enable PostgreSQL logging, disk usage alerts, and integrate
  with a monitoring solution (e.g., Netdata, Prometheus) for CPU/memory checks.
* **Secrets management** – Store database credentials and JWT signing keys in
  environment variables or a secret manager (e.g., Doppler, Vault). Never commit
  them to Git.
* **Encryption** – Use TLS for the API layer (HTTPS) and, if hosting Postgres on
  a separate machine, require SSL connections.
* **Compliance** – Because you collect sensitive identity data, document access
  controls and retain audit logs for regulatory review.

---

## 7. Next steps

1. Provision the PostgreSQL instance using the steps above.
2. Apply the schema migrations in a staging environment first.
3. Wire the backend service (e.g., Node/Express, NestJS, or Go) to use the
   `paybills_prod` database and expose the API endpoints.
4. Integrate the front end with the new APIs once authentication is live.
5. Iterate on admin and agent requirements using the same modular structure.

Document any deviations from this guide in the repository so future updates stay
aligned with the architecture.
