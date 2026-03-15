-- v2.8 Reactivation: Allow re-adding deactivated/deleted users
-- This updates admin_create_user_instant to detect existing emails and reactivate them

CREATE OR REPLACE FUNCTION public.admin_create_user_instant(
    new_email TEXT,
    new_password TEXT,
    new_full_name TEXT,
    new_role TEXT,
    target_company_id UUID
)
RETURNS JSONB AS $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- 1. Check if user already exists in auth.users by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = new_email;

    IF existing_user_id IS NOT NULL THEN
        -- Case: User exists in Auth (formerly deleted or deactivated)
        
        -- Update password and metadata in auth.users
        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('full_name', new_full_name, 'role', new_role),
            updated_at = now()
        WHERE id = existing_user_id;

        -- Ensure public.profiles reflects the re-join
        INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, can_login)
        VALUES (existing_user_id, new_email, new_full_name, new_role, target_company_id, true, true)
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            is_active = true,
            can_login = true;

        RETURN jsonb_build_object('user_id', existing_user_id, 'status', 'reactivated');
    ELSE
        -- Case: Completely new user
        existing_user_id := gen_random_uuid();

        -- Insert into auth.users 
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at, confirmation_token, recovery_token, 
            email_change_token_new, email_change
        ) VALUES (
            existing_user_id, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', new_email,
            crypt(new_password, gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', new_full_name, 'role', new_role),
            now(), now(), '', '', '', ''
        );

        -- Insert into auth.identities
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
        ) VALUES (
            gen_random_uuid(), existing_user_id, 
            json_build_object('sub', existing_user_id, 'email', new_email), 
            'email', now(), now(), now(), existing_user_id
        );

        -- Final public.profiles insert
        INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, can_login)
        VALUES (existing_user_id, new_email, new_full_name, new_role, target_company_id, true, true);

        RETURN jsonb_build_object('user_id', existing_user_id, 'status', 'success');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
