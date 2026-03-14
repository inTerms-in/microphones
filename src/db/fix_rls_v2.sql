-- Fix for 500 error (Infinite Recursion) on profiles
-- This script creates a security definer function to check roles safely.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset Profile Policies
DROP POLICY IF EXISTS "Profiles Visibility" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Manager" ON public.profiles;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Profiles are manageable by owners" ON public.profiles;
CREATE POLICY "Profiles are manageable by owners" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'owner');

-- Reset Entry Policies
DROP POLICY IF EXISTS "View Entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Insert Entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Update/Delete Entries" ON public.daily_entries;

CREATE POLICY "View Entries" ON public.daily_entries FOR SELECT TO authenticated USING (
    public.get_my_role() IN ('owner', 'partner')
    OR branch_id IN (SELECT branch_id FROM public.user_branches WHERE user_id = auth.uid())
);

CREATE POLICY "Insert Entries" ON public.daily_entries FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() IN ('owner', 'partner')
    OR branch_id IN (SELECT branch_id FROM public.user_branches WHERE user_id = auth.uid())
);

CREATE POLICY "Update/Delete Entries" ON public.daily_entries FOR ALL TO authenticated USING (
    public.get_my_role() = 'owner'
);

-- Add Page Permissions Policies (They were missing but RLS was enabled)
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.page_permissions;
CREATE POLICY "Users can view their own permissions" 
ON public.page_permissions FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "Owners can update any permissions" ON public.page_permissions;
CREATE POLICY "Owners can update any permissions" 
ON public.page_permissions FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'owner');

-- Branches management
DROP POLICY IF EXISTS "Public Read Branches" ON public.branches;
CREATE POLICY "Public Read Branches" ON public.branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage branches" ON public.branches;
CREATE POLICY "Owners can manage branches" 
ON public.branches FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'owner');

-- User Branches assignment management
DROP POLICY IF EXISTS "Public Read User Branches" ON public.user_branches;
CREATE POLICY "Public Read User Branches" ON public.user_branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage user branches" ON public.user_branches;
CREATE POLICY "Owners can manage user branches" 
ON public.user_branches FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'owner');

-- Companies management
DROP POLICY IF EXISTS "Public Read Companies" ON public.companies;
CREATE POLICY "Public Read Companies" ON public.companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage companies" ON public.companies;
CREATE POLICY "Owners can manage companies" 
ON public.companies FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'owner');

-- Ensure PostgREST reloads
NOTIFY pgrst, 'reload schema';

