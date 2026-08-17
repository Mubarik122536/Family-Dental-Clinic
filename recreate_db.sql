-- =============================================
-- Family Dental Clinic — Clean Unified Schema
-- WARNING: THIS WILL DELETE ALL EXISTING DATA
-- =============================================

-- 1. DROP ALL EXISTING TABLES
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS tooth_records;
DROP TABLE IF EXISTS tooth_records_new;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS customer_treatments;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS treatments;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

-- =============================================
-- 2. CREATE NEW TABLES
-- =============================================

-- TENANTS table
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- USERS table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  password_hash TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- CUSTOMERS table (Cleaned: no email, address, credit_limit)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  balance REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, phone)
);

-- TREATMENTS (Catalog of services)
CREATE TABLE IF NOT EXISTS treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_tooth',
  duration INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  next_visit TEXT,
  reminder INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, customer_id, visit_date)
);

-- CUSTOMER_TREATMENTS (Replaces invoices/invoice_items)
CREATE TABLE IF NOT EXISTS customer_treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  treatment_id INTEGER REFERENCES treatments(id),
  service_name TEXT NOT NULL,
  teeth TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  treatment_date TEXT DEFAULT (date('now')),
  treatment_month INTEGER,
  treatment_year INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- DEBTS
CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  treatment_id INTEGER REFERENCES treatments(id),
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'Unpaid',
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- DEBT PAYMENTS (partial payments on debts)
CREATE TABLE IF NOT EXISTS debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- TOOTH_RECORDS (Dental Charting)
CREATE TABLE IF NOT EXISTS tooth_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  treatment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  notes TEXT,
  treatment_month INTEGER,
  treatment_year INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(customer_id, tooth_number)
);

-- CASH_TRANSACTIONS (walk-in sales, auto-deleted monthly)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT,
  phone TEXT,
  services TEXT NOT NULL,
  teeth TEXT,
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  created_at TEXT DEFAULT (datetime('now'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_reminder_next ON appointments(tenant_id, reminder, next_visit);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_next_visit ON appointments(tenant_id, next_visit);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_customer ON appointments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_visit ON appointments(tenant_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_treatments_tenant ON treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_treatments_tenant ON customer_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_treatments_customer ON customer_treatments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_treatments_tenant_customer ON customer_treatments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_treatments_tenant_date ON customer_treatments(tenant_id, treatment_date);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_customer ON payments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_debts_tenant ON debts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debts_tenant_status_due ON debts(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_debts_tenant_created ON debts(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_debt_payments_tenant_debt ON debt_payments(tenant_id, debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_tenant_created ON debt_payments(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_created ON cash_transactions(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tooth_records_tenant_cust ON tooth_records(tenant_id, customer_id);

-- =============================================
-- 3. SEED INITIAL DATA
-- =============================================
INSERT INTO tenants (id, name) VALUES (1, 'Family Dental Clinic');

INSERT INTO users (email, name, role, tenant_id, password_hash) VALUES
  ('admin@familydental.com', 'Admin User', 'admin', 1, 'pbkdf2:e5f3ceba3e823ce4a1e2376ce6d61251:d631af89659d1ca25c0e587d6d0a2d792fd99918b31a7527fbd68cf0f9950e85'),
  ('staff@familydental.com', 'Staff User', 'staff', 1, '');

INSERT INTO treatments (id, tenant_id, name, category, description, price, duration) VALUES
  (1, 1, 'Dental Cleaning', 'General', 'Professional teeth cleaning', 80.00, 30),
  (2, 1, 'Teeth Whitening', 'Cosmetic', 'Professional whitening treatment', 350.00, 60),
  (3, 1, 'Root Canal', 'Endodontics', 'Root canal therapy', 750.00, 90),
  (4, 1, 'Tooth Extraction', 'Surgical', 'Simple tooth extraction', 200.00, 45),
  (5, 1, 'Dental Filling', 'General', 'Composite resin filling', 150.00, 30),
  (6, 1, 'Crown', 'Cosmetic', 'Porcelain dental crown', 900.00, 60),
  (7, 1, 'Braces Installation', 'Orthodontics', 'Metal braces fitting', 3500.00, 120),
  (8, 1, 'Dental Implant', 'Surgical', 'Titanium dental implant', 2500.00, 120),
  (9, 1, 'Orthodontic Checkup', 'Orthodontics', 'Braces adjustment', 100.00, 30),
  (10, 1, 'Dental X-Ray', 'General', 'Panoramic X-ray imaging', 50.00, 15),
  (11, 1, 'Veneer', 'Cosmetic', 'Porcelain veneer per tooth', 800.00, 45),
  (12, 1, 'Gum Treatment', 'General', 'Periodontal treatment', 300.00, 45);
