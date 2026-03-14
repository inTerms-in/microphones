-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies Table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Profiles Table (Extends Auth Users)
-- Added 'superadmin' to the role check
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('superadmin', 'owner', 'partner', 'employee')) DEFAULT 'employee',
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    is_hidden BOOLEAN DEFAULT FALSE, -- For the superadmin hidden status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User-Branch Assignment
CREATE TABLE public.user_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    UNIQUE(user_id, branch_id)
);

-- 5. Page Permissions
CREATE TABLE public.page_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_name TEXT NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_insert BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, page_name)
);

-- 6. Daily Entries
CREATE TABLE public.daily_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sales DECIMAL(12,2) DEFAULT 0,
    service_amount DECIMAL(12,2) DEFAULT 0,
    smartphone_count INTEGER DEFAULT 0,
    sim_count INTEGER DEFAULT 0,
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, entry_date)
);

-- RLS POLICIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- Superadmin sees everything
CREATE POLICY "Superadmin full access" ON public.profiles FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

-- Owners see their company data
CREATE POLICY "Owners access" ON public.profiles FOR SELECT TO authenticated USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND is_hidden = FALSE -- Hide superadmin from owners
);

-- Trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_hidden)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'employee'),
    COALESCE((new.raw_user_meta_data->>'is_hidden')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;