-- Migration: listing_type column on items
-- Adds the listing_type column that itemController.js references in every
-- INSERT, SELECT, and UPDATE query but was never defined in schema.sql.
-- Missing column → PostgreSQL error → 500 on every item creation.

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'exchange';

-- Backfill any existing rows that landed without a value (shouldn't exist,
-- but safe to run idempotently).
UPDATE items
SET listing_type = 'exchange'
WHERE listing_type IS NULL;
