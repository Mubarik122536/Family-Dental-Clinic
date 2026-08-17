-- ==========================================================
-- Family Dental Clinic — Cloudflare D1 Query Performance Optimization
-- Run these statements to create composite indexes for all high-traffic queries.
-- ==========================================================

-- 1. Payments Indexes (Eliminates full table scans in customer balance subqueries)
CREATE INDEX IF NOT EXISTS idx_payments_tenant_customer ON payments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);

-- 2. Customer Treatments Indexes
CREATE INDEX IF NOT EXISTS idx_customer_treatments_tenant_customer ON customer_treatments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_treatments_tenant_date ON customer_treatments(tenant_id, treatment_date);

-- 3. Customers Indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers(tenant_id, status);

-- 4. Appointments Indexes (Optimizes notification polling & dashboard upcoming queries)
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_reminder_next ON appointments(tenant_id, reminder, next_visit);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_next_visit ON appointments(tenant_id, next_visit);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_customer ON appointments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_visit ON appointments(tenant_id, visit_date);

-- 5. Debts & Debt Payments Indexes
CREATE INDEX IF NOT EXISTS idx_debts_tenant_status_due ON debts(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_debts_tenant_created ON debts(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_debt_payments_tenant_debt ON debt_payments(tenant_id, debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_tenant_created ON debt_payments(tenant_id, created_at);

-- 6. Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date);

-- 7. Cash Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_created ON cash_transactions(tenant_id, created_at);

-- 8. Tooth Records Indexes
CREATE INDEX IF NOT EXISTS idx_tooth_records_tenant_cust ON tooth_records(tenant_id, customer_id);
