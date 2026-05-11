-- Migration: subtype text when requester picks category "Others" on exchange offer
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS requester_item_other_subtype TEXT;
