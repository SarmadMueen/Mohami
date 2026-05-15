-- ============================================================
-- SQL Script to Completely Remove User
-- This script removes the user from auth and all related tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- CHANGE THE EMAIL ADDRESS HERE
DO $$
DECLARE
    target_email TEXT := 'migranthubgb@gmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', target_email;
    ELSE
        RAISE NOTICE 'Found user_id: % for %', target_user_id, target_email;
        
        -- ============================================================
        -- DELETE FROM CHILD TABLES (in order to respect FK constraints)
        -- ============================================================
        
        -- 1. Delete from client_messages
        DELETE FROM public.client_messages 
        WHERE admin_id::text = target_user_id::text 
        OR sender_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from client_messages';
        
        -- 2. Delete from client_shared_documents
        DELETE FROM public.client_shared_documents 
        WHERE admin_id::text = target_user_id::text 
        OR shared_by::text = target_user_id::text;
        RAISE NOTICE 'Deleted from client_shared_documents';
        
        -- 3. Delete from client_accounts
        DELETE FROM public.client_accounts 
        WHERE auth_user_id::text = target_user_id::text 
        OR admin_id::text = target_user_id::text 
        OR created_by::text = target_user_id::text;
        RAISE NOTICE 'Deleted from client_accounts';
        
        -- 4. Delete from notifications
        DELETE FROM public.notifications 
        WHERE user_id = target_user_id 
        OR created_by_user_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from notifications';
        
        -- 5. Delete from document_reviews
        DELETE FROM public.document_reviews 
        WHERE admin_id::text = target_user_id::text 
        OR lawyer_id::text = target_user_id::text 
        OR created_by::text = target_user_id::text 
        OR updated_by::text = target_user_id::text;
        RAISE NOTICE 'Deleted from document_reviews';
        
        -- 6. Delete from contract_reviews
        DELETE FROM public.contract_reviews 
        WHERE admin_id::text = target_user_id::text 
        OR lawyer_id::text = target_user_id::text 
        OR created_by::text = target_user_id::text 
        OR updated_by::text = target_user_id::text;
        RAISE NOTICE 'Deleted from contract_reviews';
        
        -- 7. Delete from consultations
        DELETE FROM public.consultations 
        WHERE admin_id::text = target_user_id::text 
        OR lawyer_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from consultations';
        
        -- 8. Delete from task_replies
        DELETE FROM public.task_replies 
        WHERE reply_by_user_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from task_replies';
        
        -- 9. Delete from payment_orders
        DELETE FROM public.payment_orders 
        WHERE user_id = target_user_id;
        RAISE NOTICE 'Deleted from payment_orders';
        
        -- 10. Delete from subscriptions
        DELETE FROM public.subscriptions 
        WHERE user_id = target_user_id;
        RAISE NOTICE 'Deleted from subscriptions';
        
        -- 11. Delete from cases (where user is admin)
        DELETE FROM public.cases 
        WHERE admin_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from cases';
        
        -- 12. Delete from clients_data (where user is admin)
        DELETE FROM public.clients_data 
        WHERE admin_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from clients_data';
        
        -- 13. Delete from office_expenses
        DELETE FROM public.office_expenses 
        WHERE admin_id::text = target_user_id::text 
        OR lawyer_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from office_expenses';
        
        -- 14. Delete from tasks (if exists)
        BEGIN
            DELETE FROM public.tasks;
            RAISE NOTICE 'Deleted from tasks';
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'Table tasks does not exist, skipping';
        END;
        
        -- 15. Delete from user_metadata
        DELETE FROM public.user_metadata 
        WHERE user_id::text = target_user_id::text 
        OR admin_user_id::text = target_user_id::text 
        OR new_lawyer_id::text = target_user_id::text;
        RAISE NOTICE 'Deleted from user_metadata';
        
        -- ============================================================
        -- FINALLY: DELETE FROM AUTH.USERS
        -- ============================================================
        DELETE FROM auth.users 
        WHERE id = target_user_id;
        RAISE NOTICE 'Deleted from auth.users';
        
        RAISE NOTICE '============================================================';
        RAISE NOTICE 'Successfully removed user % from all tables', target_email;
        RAISE NOTICE '============================================================';
    END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES (Run after deletion to verify)
-- ============================================================

-- Change the email address here for verification
DO $$
DECLARE
    verify_email TEXT := 'migranthubgb@gmail.com';
BEGIN
    -- Check if user still exists in auth.users
    RAISE NOTICE 'Checking if user % still exists in auth.users', verify_email;
    PERFORM * FROM auth.users WHERE email = verify_email;
    
    IF FOUND THEN
        RAISE NOTICE 'WARNING: User % still exists in auth.users!', verify_email;
    ELSE
        RAISE NOTICE 'SUCCESS: User % has been removed from auth.users', verify_email;
    END IF;
    
    -- Check for any remaining references in user_metadata
    RAISE NOTICE 'Checking user_metadata for remaining references...';
    PERFORM * FROM public.user_metadata 
    WHERE user_id::text IN (SELECT id::text FROM auth.users WHERE email = verify_email)
       OR admin_user_id::text IN (SELECT id::text FROM auth.users WHERE email = verify_email)
       OR new_lawyer_id::text IN (SELECT id::text FROM auth.users WHERE email = verify_email);
    
    IF FOUND THEN
        RAISE NOTICE 'WARNING: Found remaining references in user_metadata';
    ELSE
        RAISE NOTICE 'SUCCESS: No remaining references in user_metadata';
    END IF;
    
    -- Check for any remaining subscriptions
    RAISE NOTICE 'Checking subscriptions for remaining references...';
    PERFORM * FROM public.subscriptions 
    WHERE user_id::text IN (SELECT id::text FROM auth.users WHERE email = verify_email);
    
    IF FOUND THEN
        RAISE NOTICE 'WARNING: Found remaining subscriptions';
    ELSE
        RAISE NOTICE 'SUCCESS: No remaining subscriptions';
    END IF;
    
    -- Check for any remaining payment orders
    RAISE NOTICE 'Checking payment_orders for remaining references...';
    PERFORM * FROM public.payment_orders 
    WHERE user_id::text IN (SELECT id::text FROM auth.users WHERE email = verify_email);
    
    IF FOUND THEN
        RAISE NOTICE 'WARNING: Found remaining payment orders';
    ELSE
        RAISE NOTICE 'SUCCESS: No remaining payment orders';
    END IF;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Verification complete for user %', verify_email;
    RAISE NOTICE '============================================================';
END $$;
