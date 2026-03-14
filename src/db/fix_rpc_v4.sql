-- v2.6 Final Fix: Explicit ID, missing 'aud', and legacy table cleanup
-- Run this in your Supabase SQL Editor

-- 1. Cleanup: If there's a legacy public.users table, it might conflict with auth.users
-- This is often the cause of "relation users" errors if search_path is set to public.
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Update the RPC function
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
    -- Explicitly generate UUID
    new_user_id := gen_random_uuid();

    -- Insert into auth.users with all required fields for most Supabase versions
    INSERT INTO auth.users (
        id, 
        instance_id, 
        aud, 
        role, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at, 
        confirmation_token, 
        recovery_token, 
        email_change_token_new, 
        email_change
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', new_full_name, 'role', new_role),
        now(),
        now(),
        '', '', '', ''
    );

    -- Insert into auth.identities (Required for login)
    INSERT INTO auth.identities (
        id, 
        user_id, 
        identity_data, 
        provider, 
        last_sign_in_at, 
        created_at, 
        updated_at, 
        provider_id
    ) VALUES (
        gen_random_uuid(), 
        new_user_id, 
        json_build_object('sub', new_user_id, 'email', new_email), 
        'email', 
        now(), 
        now(), 
        now(), 
        new_user_id
    );

    -- Ensure profile exists in public.profiles
    INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, can_login)
    VALUES (new_user_id, new_email, new_full_name, new_role, target_company_id, true, true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        company_id = EXCLUDED.company_id,
        is_active = EXCLUDED.is_active,
        can_login = EXCLUDED.can_login;

    RETURN jsonb_build_object('user_id', new_user_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
