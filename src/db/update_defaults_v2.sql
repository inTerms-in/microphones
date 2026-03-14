-- v2.2 Update: Automated Assignments & PDF Support
-- This script updates the default permission logic and adds reporting helpers.

-- 1. Updated set_default_permissions function
CREATE OR REPLACE FUNCTION public.set_default_permissions()
RETURNS TRIGGER AS $$
DECLARE
    branch_record RECORD;
BEGIN
    -- A. PAGE PERMISSIONS
    -- Dashboard (All roles get view)
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'dashboard', true, false, false, false);
    
    -- Entry Form (All roles get view/insert/update)
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'entryform', true, true, true, false);
    
    -- Settings (Owner gets full, Partner gets none, Employee gets none)
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'settings', (NEW.role = 'owner'), (NEW.role = 'owner'), (NEW.role = 'owner'), (NEW.role = 'owner'));
    
    -- Reports (Owner/Partner get view)
    INSERT INTO public.page_permissions (user_id, page_name, can_view, can_insert, can_update, can_delete)
    VALUES (NEW.id, 'reports', (NEW.role IN ('owner', 'partner')), false, false, false);
    
    -- B. BRANCH ASSIGNMENTS
    -- If Owner or Partner, assign ALL existing branches automatically
    IF NEW.role IN ('owner', 'partner') THEN
        FOR branch_record IN SELECT id FROM public.branches LOOP
            INSERT INTO public.user_branches (user_id, branch_id)
            VALUES (NEW.id, branch_record.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper for DB Backup (Triggering schema reload and exposing metadata)
CREATE OR REPLACE FUNCTION public.get_db_backup_json()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'companies', (SELECT jsonb_agg(c) FROM public.companies c),
        'branches', (SELECT jsonb_agg(b) FROM public.branches b),
        'profiles', (SELECT jsonb_agg(p) FROM public.profiles p),
        'user_branches', (SELECT jsonb_agg(ub) FROM public.user_branches ub),
        'daily_entries', (SELECT jsonb_agg(de) FROM public.daily_entries de),
        'page_permissions', (SELECT jsonb_agg(pp) FROM public.page_permissions pp),
        'backup_at', now()
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS allows Owners to run the backup function
-- (Functions are SECURITY DEFINER so they bypass RLS, but we restrict who can call the RPC in the app layer)

NOTIFY pgrst, 'reload schema';
