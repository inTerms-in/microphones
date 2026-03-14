-- v2.5 Fix: Explicit ID generation and Profile insertion
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
    -- 1. Explicitly generate UUID for the new user
    new_user_id := gen_random_uuid();

    -- 2. Insert into auth.users (Using the generated ID)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, instance_id)
    VALUES (
        new_user_id,
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', new_full_name, 'role', new_role),
        now(),
        now(),
        'authenticated',
        '00000000-0000-0000-0000-000000000000'
    );

    -- 3. Ensure profile exists (Use UPSERT pattern to be safe)
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
