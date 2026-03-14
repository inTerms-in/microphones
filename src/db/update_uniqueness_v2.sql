-- v2.3 Update: Entry Uniqueness & Dropdown Fixes
-- This script adds a unique constraint to prevent duplicate same-day entries for a single branch.

-- 1. Add unique constraint to daily_entries
-- Note: This might fail if there are existing duplicates. In a real app, we'd clean them first.
ALTER TABLE public.daily_entries 
ADD CONSTRAINT unique_branch_date_entry UNIQUE (branch_id, entry_date);

-- Reload schema
NOTIFY pgrst, 'reload schema';
