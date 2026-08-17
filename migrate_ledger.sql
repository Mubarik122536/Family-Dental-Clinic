CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'invoice' or 'payment'
  amount REAL NOT NULL, -- positive for invoices (debt), negative for payments (credit)
  reference_id INTEGER, -- invoice.id or payment.id
  notes TEXT,
  date TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);

-- Migrate existing invoices into the ledger
INSERT INTO transactions (tenant_id, customer_id, type, amount, reference_id, date, notes)
SELECT tenant_id, customer_id, 'invoice', total, id, created_at, 'Auto-migrated Invoice ' || invoice_number
FROM invoices
WHERE status != 'Voided';

-- Migrate existing payments into the ledger
INSERT INTO transactions (tenant_id, customer_id, type, amount, reference_id, date, notes)
SELECT tenant_id, customer_id, 'payment', -amount, id, created_at, 'Auto-migrated Payment (' || method || ')'
FROM payments;
