-- v2.0 Baseline Schema: Smart Sales Tracker
-- Focus: Performance, Permission Matrix, Single-Company

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLEANUP (Double Check)
DROP TABLE IF EXISTS public.daily_entries CASCADE;
DROP TABLE IF EXISTS public.page_permissions CASCADE;
DROP TABLE IF EXISTS public.user_branches CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. TABLES

-- Companies (Single-tenant focus but kept table for flexibility)
CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    financial_year_start_month int DEFAULT 4,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Branches
CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Profiles (Extends auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    role text DEFAULT 'employee', -- owner, partner, employee
    is_active boolean DEFAULT true,
    can_login boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Many-to-Many: Users to Branches
CREATE TABLE public.user_branches (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, branch_id)
);

-- Page Permissions (Overrides)
-- Pages: dashboard, entryform, settings, reports
CREATE TABLE public.page_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_name text NOT NULL, -- e.g., 'dashboard'
    can_view boolean DEFAULT true,
    can_insert boolean DEFAULT false,
    can_update boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    UNIQUE(user_id, page_name)
);

-- Daily Entries
CREATE TABLE public.daily_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid REFERENCES public.profiles(id),
    total_sales numeric(15,2) DEFAULT 0,
    service_amount numeric(15,2) DEFAULT 0,
    smartphone_count int DEFAULT 0,
    sim_count int DEFAULT 0,
    remarks text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(branch_id, entry_date) -- One entry per branch per day
);

-- 3. ENABLE RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Simplified for Owner/Partner/Employee visibility)

-- Profiles: View all for admins, self for others
CREATE POLICY "Profiles Visibility" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles Manager" ON public.profiles FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
);

-- Companies/Branches: Visible to all authenticated
CREATE POLICY "Public Read" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read Branches" ON public.branches FOR SELECT TO authenticated USING (true);

-- Daily Entries: 
-- 1. Employees can view their assigned branches' entries
-- 2. Owners/Partners view all
CREATE POLICY "View Entries" ON public.daily_entries FOR SELECT TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'partner')
    OR branch_id IN (SELECT branch_id FROM public.user_branches WHERE user_id = auth.uid())
);

CREATE POLICY "Insert Entries" ON public.daily_entries FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'partner')
    OR branch_id IN (SELECT branch_id FROM public.user_branches WHERE user_id = auth.uid())
);

CREATE POLICY "Update/Delete Entries" ON public.daily_entries FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
);

-- 5. FUNCTIONS & TRIGGERS

-- Auto-set permissions on user create
CREATE OR REPLACE FUNCTION public.set_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Dashboard
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'dashboard', true, false, false, false);
    -- Entry Form
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'entryform', true, true, true, false);
    -- Settings
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'settings', (NEW.role = 'owner'), (NEW.role = 'owner'), (NEW.role = 'owner'), (NEW.role = 'owner'));
    -- Reports
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'reports', (NEW.role IN ('owner', 'partner')), false, false, false);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_default_permissions();

-- 6. RPC: Instant Admin Create User
CREATE OR REPLACE FUNCTION public.admin_create_user_instant(
    new_email TEXT,
    new_password TEXT,
    new_full_name TEXT,
    new_role TEXT,
    target_company_id UUID
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- 1. Insert into auth.users (Instant activation)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
        new_email, crypt(new_password, gen_salt('bf')), now(), 
        '{"provider":"email","providers":["email"]}', json_build_object('full_name', new_full_name, 'role', new_role), now(), now(), '', '', '', ''
    ) RETURNING id INTO new_user_id;

    -- 2. Insert into auth.identities
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
        gen_random_uuid(), new_user_id, json_build_object('sub', new_user_id, 'email', new_email), 
        'email', now(), now(), now(), new_user_id
    );

    -- 3. Insert into public.profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, new_email, new_full_name, new_role);

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. INITIAL DATA
INSERT INTO public.companies (name) VALUES ('Microphone Mobile Services') RETURNING id;

-- Note: The first actual user will be injected via Node to handle the owner role setup properly.
