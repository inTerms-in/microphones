-- v2.4 Update: Purchase/Expense tracking and Automation
-- 1. Add new tracking fields to daily_entries
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS expense_amount NUMERIC DEFAULT 0;

-- 2. Automation: Trigger to assign new branches to Owners/Partners
CREATE OR REPLACE FUNCTION public.auto_assign_branch_to_admins()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_branches (user_id, branch_id)
    SELECT id, NEW.id 
    FROM public.profiles 
    WHERE role IN ('owner', 'partner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS branch_auto_assignment_trigger ON public.branches;
CREATE TRIGGER branch_auto_assignment_trigger
AFTER INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_branch_to_admins();

-- 3. Update admin_create_user_instant to set defaults to true
DROP FUNCTION IF EXISTS public.admin_create_user_instant(TEXT, TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.admin_create_user_instant(
    new_email TEXT,
    new_password TEXT,
    new_full_name TEXT,
    new_role TEXT,
    target_company_id UUID
)
RETURNS JSONB AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This uses the supabase auth.users table indirectly through the auth schema
    -- Note: In a real managed environment, you might use the service_role key 
    -- but for this SQL rpc we assume the function has bypass RLS or superuser permissions
    
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, instance_id)
    VALUES (
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', new_full_name),
        now(),
        now(),
        'authenticated',
        '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO new_user_id;

    -- Update profile with default ON for active/login
    UPDATE public.profiles 
    SET full_name = new_full_name, 
        role = new_role, 
        company_id = target_company_id,
        is_active = true,     -- Default ON
        can_login = true      -- Default ON
    WHERE id = new_user_id;

    RETURN jsonb_build_object('user_id', new_user_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Manual run for existing branches (ensure all owners/partners are assigned)
-- This catches any missed assignments before the trigger was created
INSERT INTO public.user_branches (user_id, branch_id)
SELECT p.id, b.id
FROM public.profiles p, public.branches b
WHERE p.role IN ('owner', 'partner')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
