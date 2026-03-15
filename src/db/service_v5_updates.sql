-- Add job_type to service_jobs
ALTER TABLE public.service_jobs ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'customer' CHECK (job_type IN ('customer', 'house'));
