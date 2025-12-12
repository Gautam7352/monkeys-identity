-- Migration: 000002_seed_data
-- Description: Seed initial data (Default Organization, Users, Roles, Policies)

-- =============================================================================
-- DEFAULT ORGANIZATION
-- =============================================================================

INSERT INTO organizations (
    id, name, slug, description, settings, status
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Default Organization',
    'default',
    'Default organization for initial system setup',
    '{"theme": "default", "timezone": "UTC", "language": "en"}',
    'active'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEFAULT ROLES
-- =============================================================================

INSERT INTO roles (
    id, name, description, organization_id, role_type, trust_policy, assume_role_policy, is_system_role, status
) VALUES 
(
    '00000000-0000-4000-8000-000000000010',
    'admin',
    'Full administrative access to all system resources',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["*"], "resource": ["*"]}]}',
    true,
    'active'
),
(
    '00000000-0000-4000-8000-000000000011',
    'org-admin',
    'Administrative access within organization scope',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["organization:*", "users:*", "groups:*", "roles:read"], "resource": ["*"]}]}',
    true,
    'active'
),
(
    '00000000-0000-4000-8000-000000000012',
    'user',
    'Standard user permissions for regular operations',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["profile:read", "profile:update", "resources:read"], "resource": ["*"]}]}',
    true,
    'active'
),
(
    '00000000-0000-4000-8000-000000000013',
    'viewer',
    'Read-only access to permitted resources',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "user"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["profile:read", "resources:read"], "resource": ["*"]}]}',
    true,
    'active'
),
(
    '00000000-0000-4000-8000-000000000014',
    'service',
    'Service account permissions for API access',
    '00000000-0000-4000-8000-000000000001',
    'system',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "principal": {"type": "service_account"}, "action": ["sts:AssumeRole"]}]}',
    '{"version": "2024-01-01", "statement": [{"effect": "allow", "action": ["api:read", "api:write", "resources:read"], "resource": ["*"]}]}',
    true,
    'active'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEFAULT GROUPS
-- =============================================================================

INSERT INTO groups (
    id, name, description, organization_id, parent_group_id, group_type, attributes, max_members, status
) VALUES 
(
    '00000000-0000-4000-8000-000000000800',
    'Administrators',
    'System and organization administrators',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'security',
    '{"auto_assign": false}',
    10,
    'active'
),
(
    '00000000-0000-4000-8000-000000000801',
    'IT Department',
    'Information Technology department staff',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'department',
    '{"auto_assign": false}',
    50,
    'active'
),
(
    '00000000-0000-4000-8000-000000000802',
    'General Users',
    'General users group for default access',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'standard',
    '{"auto_assign": true}',
    500,
    'active'
),
(
    '00000000-0000-4000-8000-000000000803',
    'Security Operations',
    'Security operations and incident response team',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000800',
    'security',
    '{"auto_assign": false}',
    25,
    'active'
),
(
    '00000000-0000-4000-8000-000000000804', -- ID inferred/generated
    'Auditors',
    'Users with audit and compliance access',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'security',
    '{"auto_assign": false}',
    20,
    'active'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEFAULT POLICIES
-- =============================================================================

INSERT INTO policies (
    id, name, description, organization_id, version, document, policy_type, effect, is_system_policy, status
) VALUES 
(
    '00000000-0000-0000-0000-000000000006', -- Re-ID to avoid conflict/ensure uniqueness
    'FullAccess',
    'Full access policy',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": ["*"],
                "resource": ["*"],
                "condition": {}
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    true,
    'active'
),
(
    '00000000-0000-0000-0000-000000000007', -- Re-ID
    'ReadOnlyAccess',
    'Read-only access policy',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "users:read",
                    "roles:read", 
                    "policies:read",
                    "organizations:read",
                    "resources:read",
                    "profile:read",
                    "audit:read"
                ],
                "resource": ["*"],
                "condition": {}
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    true,
    'active'
),
(
    '00000000-0000-0000-0000-000000000003',
    'OrganizationAdminAccess',
    'Administrative access within organization scope',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "users:*",
                    "groups:*",
                    "roles:read",
                    "roles:update",
                    "policies:read",
                    "resources:*",
                    "profile:*",
                    "organization:read",
                    "organization:update",
                    "audit:read"
                ],
                "resource": ["arn:monkey:iam:org:${organization_id}/*"],
                "condition": {}
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    true,
    'active'
),
(
    '00000000-0000-0000-0000-000000000004',
    'StandardUserAccess',
    'Standard user access policy for regular operations',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "profile:read",
                    "profile:update",
                    "resources:read",
                    "users:read"
                ],
                "resource": [
                    "arn:monkey:iam:user:${user_id}",
                    "arn:monkey:iam:org:${organization_id}/resource/*"
                ],
                "condition": {}
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    true,
    'active'
),
(
    '00000000-0000-0000-0000-000000000005',
    'ServiceAccountAccess',
    'Service account permissions for API operations',
    '00000000-0000-4000-8000-000000000001',
    '1.0',
    '{
        "version": "2024-01-01",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "api:*",
                    "resources:*",
                    "users:read",
                    "audit:write"
                ],
                "resource": ["*"],
                "condition": {
                    "IpAddress": {
                        "aws:SourceIp": ["0.0.0.0/0"]
                    }
                }
            }
        ]
    }'::JSONB,
    'access',
    'allow',
    true,
    'active'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEFAULT RESOURCES
-- =============================================================================

INSERT INTO resources (
    id, name, description, organization_id, type, arn, attributes, tags, status
) VALUES 
(
    '00000000-0000-4000-8000-000000000900',
    'User Management System',
    'User creation, modification, and deletion operations',
    '00000000-0000-4000-8000-000000000001',
    'application',
    'arn:monkey:iam:org:00000000-0000-4000-8000-000000000001:resource/user-management',
    '{"endpoint": "/api/v1/users", "methods": ["GET", "POST", "PUT", "DELETE"], "rate_limit": 100}',
    '{"category": "user-management", "criticality": "high", "department": "IT"}',
    'active'
),
(
    '00000000-0000-4000-8000-000000000901',
    'Role Management System',
    'Role and permission management operations',
    '00000000-0000-4000-8000-000000000001',
    'application',
    'arn:monkey:iam:org:00000000-0000-4000-8000-000000000001:resource/role-management',
    '{"endpoint": "/api/v1/roles", "methods": ["GET", "POST", "PUT", "DELETE"], "rate_limit": 50}',
    '{"category": "access-control", "criticality": "high", "department": "IT"}',
    'active'
),
(
    '00000000-0000-4000-8000-000000000902',
    'Organization Settings',
    'Organization configuration and settings management',
    '00000000-0000-4000-8000-000000000001',
    'configuration',
    'arn:monkey:iam:org:00000000-0000-4000-8000-000000000001:resource/org-settings',
    '{"endpoint": "/api/v1/organizations", "methods": ["GET", "PUT"], "rate_limit": 20}',
    '{"category": "configuration", "criticality": "medium", "department": "Operations"}',
    'active'
),
(
    '00000000-0000-4000-8000-000000000903',
    'Audit Logs',
    'System audit logs and compliance reporting',
    '00000000-0000-4000-8000-000000000001',
    'data',
    'arn:monkey:iam:org:00000000-0000-4000-8000-000000000001:resource/audit-logs',
    '{"endpoint": "/api/v1/audit", "methods": ["GET"], "rate_limit": 200, "retention_days": 2555}',
    '{"category": "audit", "criticality": "high", "department": "Compliance"}',
    'active'
),
(
    '00000000-0000-4000-8000-000000000904',
    'API Documentation',
    'System API documentation and developer resources',
    '00000000-0000-4000-8000-000000000001',
    'documentation',
    'arn:monkey:iam:org:00000000-0000-4000-8000-000000000001:resource/api-docs',
    '{"endpoint": "/api/docs", "methods": ["GET"], "rate_limit": 1000, "public": true}',
    '{"category": "documentation", "criticality": "low", "department": "Development"}',
    'active'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLE POLICIES
-- =============================================================================

INSERT INTO role_policies (
    id, role_id, policy_id, attached_by
) VALUES 
(
    '00000000-0000-4000-8000-000000000700',
    '00000000-0000-4000-8000-000000000010', -- admin role
    '00000000-0000-0000-0000-000000000006', -- FullAccess (new ID)
    NULL
),
(
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000014', -- service role
    '00000000-0000-0000-0000-000000000005', -- ServiceAccountAccess
    NULL
),
(
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000011', -- org-admin role
    '00000000-0000-0000-0000-000000000003', -- OrganizationAdminAccess
    NULL
),
(
    '00000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000012', -- user role
    '00000000-0000-0000-0000-000000000004', -- StandardUserAccess
    NULL
),
(
    '00000000-0000-4000-8000-000000000704',
    '00000000-0000-4000-8000-000000000013', -- viewer role
    '00000000-0000-0000-0000-000000000007', -- ReadOnlyAccess (new ID)
    NULL
)
ON CONFLICT DO NOTHING;

-- Refresh permissions
REFRESH MATERIALIZED VIEW user_effective_permissions;
