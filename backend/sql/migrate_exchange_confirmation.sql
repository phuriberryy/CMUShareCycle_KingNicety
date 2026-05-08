-- Migration: exchange confirmation fields on chats
-- Adds per-party confirmation flags so both owner and requester must
-- independently confirm the physical exchange before it is marked complete.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS owner_confirmed    BOOLEAN    DEFAULT FALSE;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS requester_confirmed BOOLEAN   DEFAULT FALSE;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chats_confirmed_at ON chats(confirmed_at);
