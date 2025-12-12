-- Migration: 000003_blogging_platform_iam
-- Description: IAM setup for blogging platform with blog resources, roles, and policies

-- =============================================================================
-- BLOGGING PLATFORM IAM SETUP
-- =============================================================================

-- Note: 'blog' resource type enum value added separately

-- Get the default organization ID
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default' LIMIT 1;
    
    IF default_org_id IS NULL THEN
        RAISE EXCEPTION 'Default organization not found';
    END IF;

-- =============================================================================
-- BLOG-SPECIFIC ROLES
-- =============================================================================

-- Blog Owner Role - Full control over owned blogs
INSERT INTO roles (
    id, name, description, organization_id, role_type, trust_policy, assume_role_policy, is_system_role, status
) VALUES (
    '00000000-0000-4000-8000-000000000020',
    'blog-owner',
    'Full control over owned blogs - create, read, update, delete, manage co-authors',
    default_org_id,
    'blogging',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["blog:*"], "resource": ["arn:monkey:blog:*:*:blog/*"], "condition": {"StringEquals": {"blog:owner": "${user.id}"}}}]}',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Blog Co-Author Role - Edit, publish, archive (no delete)
INSERT INTO roles (
    id, name, description, organization_id, role_type, trust_policy, assume_role_policy, is_system_role, status
) VALUES (
    '00000000-0000-4000-8000-000000000021',
    'blog-co-author',
    'Co-author access to blogs - edit, publish, archive (cannot delete)',
    default_org_id,
    'blogging',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["blog:read", "blog:update", "blog:publish", "blog:archive"], "resource": ["arn:monkey:blog:*:*:blog/*"], "condition": {"StringEquals": {"blog:co-author": "${user.id}"}}}]}',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Blog Reader Role - Read published blogs
INSERT INTO roles (
    id, name, description, organization_id, role_type, trust_policy, assume_role_policy, is_system_role, status
) VALUES (
    '00000000-0000-4000-8000-000000000022',
    'blog-reader',
    'Read access to published blogs',
    default_org_id,
    'blogging',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["blog:read"], "resource": ["arn:monkey:blog:*:*:blog/*"], "condition": {"StringEquals": {"blog:status": "published"}}}]}',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- BLOG-SPECIFIC POLICIES
-- =============================================================================

-- Blog Owner Policy - Comprehensive blog management
INSERT INTO policies (
    id, name, description, organization_id, version, document, policy_type, effect, is_system_policy, status
) VALUES (
    '00000000-0000-0000-0000-000000000010',
    'BlogOwnerPolicy',
    'Full access policy for blog owners',
    default_org_id,
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "blog:create",
                    "blog:read",
                    "blog:update",
                    "blog:delete",
                    "blog:publish",
                    "blog:archive",
                    "blog:invite-co-author",
                    "blog:remove-co-author"
                ],
                "resource": ["arn:monkey:blog:*:*:blog/*"],
                "condition": {
                    "StringEquals": {
                        "blog:owner": "${user.id}"
                    }
                }
            },
            {
                "effect": "allow",
                "action": ["blog:read"],
                "resource": ["arn:monkey:blog:*:*:blog/*"],
                "condition": {
                    "StringEquals": {
                        "blog:status": ["draft", "archived"]
                    },
                    "StringEquals": {
                        "blog:owner": "${user.id}"
                    }
                }
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Blog Co-Author Policy - Limited editing access
INSERT INTO policies (
    id, name, description, organization_id, version, document, policy_type, effect, is_system_policy, status
) VALUES (
    '00000000-0000-0000-0000-000000000011',
    'BlogCoAuthorPolicy',
    'Co-author policy for blog collaboration',
    default_org_id,
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "blog:read",
                    "blog:update",
                    "blog:publish",
                    "blog:archive"
                ],
                "resource": ["arn:monkey:blog:*:*:blog/*"],
                "condition": {
                    "StringEquals": {
                        "blog:co-author": "${user.id}"
                    }
                }
            },
            {
                "effect": "allow",
                "action": ["blog:read"],
                "resource": ["arn:monkey:blog:*:*:blog/*"],
                "condition": {
                    "StringEquals": {
                        "blog:status": ["draft", "archived"]
                    },
                    "StringEquals": {
                        "blog:co-author": "${user.id}"
                    }
                }
            },
            {
                "effect": "deny",
                "action": ["blog:delete"],
                "resource": ["arn:monkey:blog:*:*:blog/*"]
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- Blog Reader Policy - Public read access
INSERT INTO policies (
    id, name, description, organization_id, version, document, policy_type, effect, is_system_policy, status
) VALUES (
    '00000000-0000-0000-0000-000000000012',
    'BlogReaderPolicy',
    'Read access policy for published blogs',
    default_org_id,
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": ["blog:read"],
                "resource": ["arn:monkey:blog:*:*:blog/*"],
                "condition": {
                    "StringEquals": {
                        "blog:status": "published"
                    }
                }
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    false,
    'active'
) ON CONFLICT (organization_id, name) DO NOTHING;

-- =============================================================================
-- ATTACH POLICIES TO ROLES
-- =============================================================================

-- Attach BlogOwnerPolicy to blog-owner role
INSERT INTO role_policies (role_id, policy_id)
SELECT '00000000-0000-4000-8000-000000000020', id
FROM policies WHERE name = 'BlogOwnerPolicy' AND organization_id = default_org_id
ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach BlogCoAuthorPolicy to blog-co-author role
INSERT INTO role_policies (role_id, policy_id)
SELECT '00000000-0000-4000-8000-000000000021', id
FROM policies WHERE name = 'BlogCoAuthorPolicy' AND organization_id = default_org_id
ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Attach BlogReaderPolicy to blog-reader role
INSERT INTO role_policies (role_id, policy_id)
SELECT '00000000-0000-4000-8000-000000000022', id
FROM policies WHERE name = 'BlogReaderPolicy' AND organization_id = default_org_id
ON CONFLICT (role_id, policy_id) DO NOTHING;

-- =============================================================================
-- SAMPLE BLOG RESOURCES (for testing)
-- =============================================================================

-- Sample blog owned by admin user
INSERT INTO resources (
    id, arn, name, description, type, organization_id, owner_id, owner_type,
    attributes, tags, access_level, status
) VALUES (
    '00000000-0000-4000-8000-000000000100',
    CONCAT('arn:monkey:blog:org:', default_org_id::text, ':blog/00000000-0000-4000-8000-000000000100'),
    'Welcome to Our Blog',
    'First blog post introducing our platform',
    'blog',
    default_org_id,
    '00000000-0000-4000-8000-000000000002', -- admin user
    'user',
    '{
        "blog_status": "published",
        "co_authors": [],
        "word_count": 250,
        "category": "announcement",
        "tags": ["welcome", "introduction"]
    }',
    '{"category": "announcement", "featured": "true"}',
    'public',
    'active'
) ON CONFLICT (arn) DO NOTHING;

-- Sample draft blog
INSERT INTO resources (
    id, arn, name, description, type, organization_id, owner_id, owner_type,
    attributes, tags, access_level, status
) VALUES (
    '00000000-0000-4000-8000-000000000101',
    CONCAT('arn:monkey:blog:org:', default_org_id::text, ':blog/00000000-0000-4000-8000-000000000101'),
    'Draft: Advanced IAM Features',
    'Work in progress blog about IAM features',
    'blog',
    default_org_id,
    '00000000-0000-4000-8000-000000000002', -- admin user
    'user',
    '{
        "blog_status": "draft",
        "co_authors": ["00000000-0000-4000-8000-000000000003"],
        "word_count": 500,
        "category": "technical",
        "tags": ["iam", "security", "draft"]
    }',
    '{"category": "technical", "status": "draft"}',
    'private',
    'active'
) ON CONFLICT (arn) DO NOTHING;

-- =============================================================================
-- SAMPLE ROLE ASSIGNMENTS
-- =============================================================================
-- Note: Role assignments should be done through the application API
-- to ensure proper user validation and audit logging

END $$;