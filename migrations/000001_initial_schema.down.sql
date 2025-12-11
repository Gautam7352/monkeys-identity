-- Migration: 000001_initial_schema
-- Description: Revert initial schema setup

-- Functions (must drop triggers first)
DROP TRIGGER IF EXISTS trigger_refresh_permissions_on_role_policy ON role_policies;
DROP TRIGGER IF EXISTS trigger_refresh_permissions_on_role_assignment ON role_assignments;
DROP FUNCTION IF EXISTS refresh_user_permissions();

DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS trigger_policies_updated_at ON policies;
DROP TRIGGER IF EXISTS trigger_resources_updated_at ON resources;
DROP TRIGGER IF EXISTS trigger_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS trigger_service_accounts_updated_at ON service_accounts;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP FUNCTION IF EXISTS log_audit_event(UUID, principal_type, VARCHAR, UUID, VARCHAR, audit_result, JSONB);
DROP FUNCTION IF EXISTS check_user_permission(UUID, VARCHAR, VARCHAR, JSONB);

-- Views
DROP VIEW IF EXISTS resource_hierarchy;
DROP VIEW IF EXISTS organization_hierarchy;
DROP MATERIALIZED VIEW IF EXISTS user_effective_permissions;

-- Tables (Order matters due to foreign keys)
DROP TABLE IF EXISTS access_reviews;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS role_assignments;
DROP TABLE IF EXISTS role_policies;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS policy_versions;
DROP TABLE IF EXISTS policies;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS group_memberships;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS service_accounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- Types
DROP TYPE IF EXISTS mfa_method;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS audit_result;
DROP TYPE IF EXISTS policy_effect;
DROP TYPE IF EXISTS resource_type;
DROP TYPE IF EXISTS principal_type;
DROP TYPE IF EXISTS entity_status;

-- Extensions (Optional: usually better to leave enabled, but for completeness)
-- DROP EXTENSION IF EXISTS "btree_gin";
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
