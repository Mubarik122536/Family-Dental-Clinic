-- Expenses table for tracking clinic expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
