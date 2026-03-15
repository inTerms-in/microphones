-- Add assigned_to and delivery_date to service_jobs
ALTER TABLE public.service_jobs ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);
ALTER TABLE public.service_jobs ADD COLUMN IF NOT EXISTS delivery_date date;
