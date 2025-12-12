-- Migration: 000003_blogging_platform_iam (DOWN)
-- Description: Remove blogging platform IAM setup

-- Remove sample role assignments
DELETE FROM role_assignments
WHERE role_id IN (
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000022'
);

-- Remove sample blog resources
DELETE FROM resources
WHERE id IN (
    '00000000-0000-4000-8000-000000000100',
    '00000000-0000-4000-8000-000000000101'
);

-- Remove role-policy attachments
DELETE FROM role_policies
WHERE role_id IN (
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000022'
);

-- Remove policies
DELETE FROM policies
WHERE name IN ('BlogOwnerPolicy', 'BlogCoAuthorPolicy', 'BlogReaderPolicy')
AND organization_id = '00000000-0000-4000-8000-000000000001';

-- Remove roles
DELETE FROM roles
WHERE name IN ('blog-owner', 'blog-co-author', 'blog-reader')
AND organization_id = '00000000-0000-4000-8000-000000000001';