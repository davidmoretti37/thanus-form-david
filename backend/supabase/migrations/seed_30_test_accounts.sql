-- =====================================================
-- SEED 30 TEST ACCOUNTS WITH USERS FOR TESTING
-- =====================================================
-- This script creates:
-- - 30 test users in auth.users
-- - 30 personal accounts in basejump.accounts
-- - Links them via basejump.account_user
-- Run this script in your Supabase SQL editor or via migration

BEGIN;

-- Create 30 test users in auth.users with personal accounts
DO $$
DECLARE
    i INTEGER;
    v_user_id UUID;
    v_account_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    FOR i IN 1..30 LOOP
        v_user_email := 'test-user-' || i || '@example.com';
        v_user_name := 'Test User ' || i;

        -- Check if user already exists
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_user_email;

        -- Create user if doesn't exist
        IF v_user_id IS NULL THEN
            -- Generate UUID for the user
            v_user_id := gen_random_uuid();

            -- Insert into auth.users
            -- Note: This is a minimal user record. In production, users are created via Supabase Auth
            INSERT INTO auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                created_at,
                updated_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                role,
                aud
            ) VALUES (
                v_user_id,
                '00000000-0000-0000-0000-000000000000'::uuid,
                v_user_email,
                crypt('TestPassword123!', gen_salt('bf')), -- Test password
                NOW(),
                NOW(),
                NOW(),
                jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                jsonb_build_object('name', v_user_name),
                false,
                'authenticated',
                'authenticated'
            );

            RAISE NOTICE 'Created user: % (ID: %)', v_user_email, v_user_id;
        ELSE
            RAISE NOTICE 'User already exists: % (ID: %)', v_user_email, v_user_id;
        END IF;

        -- Create personal account for this user
        -- The account ID should match the user ID for personal accounts
        v_account_id := v_user_id;

        -- Insert personal account
        -- Note: personal accounts must have slug = NULL per database constraint
        INSERT INTO basejump.accounts (
            id,
            primary_owner_user_id,
            name,
            slug,
            personal_account,
            created_at,
            updated_at,
            public_metadata
        ) VALUES (
            v_account_id,
            v_user_id,
            v_user_name,
            NULL, -- Personal accounts require NULL slug
            true, -- Personal account
            NOW(),
            NOW(),
            jsonb_build_object(
                'is_test_account', true,
                'test_batch', 'seed_30_accounts',
                'created_by_script', true,
                'test_number', i
            )
        )
        ON CONFLICT (id) DO NOTHING;

        -- Add user to account_user table (for permissions)
        INSERT INTO basejump.account_user (
            user_id,
            account_id,
            account_role
        ) VALUES (
            v_user_id,
            v_account_id,
            'owner'
        )
        ON CONFLICT (user_id, account_id) DO NOTHING;

    END LOOP;
END $$;

-- Show summary of what was created
DO $$
DECLARE
    user_count INTEGER;
    account_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count
    FROM auth.users
    WHERE email LIKE 'test-user-%@example.com';

    SELECT COUNT(*) INTO account_count
    FROM basejump.accounts
    WHERE (public_metadata->>'is_test_account')::boolean = true
    AND personal_account = true;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Data Creation Summary:';
    RAISE NOTICE '- Users created: %', user_count;
    RAISE NOTICE '- Personal accounts created: %', account_count;
    RAISE NOTICE '- Email pattern: test-user-N@example.com (N=1-30)';
    RAISE NOTICE '- Password: TestPassword123!';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this separately after the script to verify everything was created:
/*
SELECT
    u.id as user_id,
    u.email,
    a.id as account_id,
    a.name as account_name,
    a.slug,
    a.personal_account,
    au.account_role,
    a.created_at
FROM auth.users u
JOIN basejump.accounts a ON a.id = u.id
JOIN basejump.account_user au ON au.user_id = u.id AND au.account_id = a.id
WHERE u.email LIKE 'test-user-%@example.com'
ORDER BY u.email;
*/

-- =====================================================
-- LOGIN CREDENTIALS
-- =====================================================
-- You can login with any of these accounts:
-- Email: test-user-1@example.com through test-user-30@example.com
-- Password: TestPassword123!

-- =====================================================
-- CLEANUP SCRIPT (Optional)
-- =====================================================
-- To remove all test users and accounts created by this script:
/*
BEGIN;

-- Delete from account_user first (foreign key constraint)
DELETE FROM basejump.account_user
WHERE account_id IN (
    SELECT id FROM basejump.accounts
    WHERE personal_account = true
    AND (public_metadata->>'is_test_account')::boolean = true
);

-- Delete accounts
DELETE FROM basejump.accounts
WHERE personal_account = true
AND (public_metadata->>'is_test_account')::boolean = true;

-- Delete users (this will cascade delete accounts via foreign key)
DELETE FROM auth.users
WHERE email LIKE 'test-user-%@example.com';

COMMIT;
*/
