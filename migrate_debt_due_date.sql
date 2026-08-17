-- Add due_date column to debts table for payment promise tracking
ALTER TABLE debts ADD COLUMN due_date TEXT;

-- Index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
