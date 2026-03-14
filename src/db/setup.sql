-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('superadmin', 'owner', 'partner', 'employee')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_entries table
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  total_sales DECIMAL(12,2) DEFAULT 0,
  service_amount DECIMAL(12,2) DEFAULT 0,
  smartphone_count INTEGER DEFAULT 0,
  sim_count INTEGER DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, entry_date)
);

-- Create page_permissions table
CREATE TABLE IF NOT EXISTS public.page_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_insert BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, page_name)
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Allow public read for companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Users can see their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Superadmins can see everything" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Trigger to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_hidden)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'Super Admin'),
    CASE 
      WHEN new.email = 'superadmin@sparkflow.com' THEN 'superadmin'
      ELSE 'employee'
    END,
    CASE 
      WHEN new.email = 'superadmin@sparkflow.com' THEN TRUE
      ELSE FALSE
    END
  );
  RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();