import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/OrganizationDetail.css';
import '../styles/OrganizationModal.css';

const OrganizationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [organization, setOrganization] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roles, setRoles] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [resources, setResources] = useState([]);
    const [orgSettings, setOrgSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        slug: '',
        parent_id: '',
        description: '',
        billing_tier: '',
        status: '',
        max_users: '',
        max_resources: '',
        metadata: '',
        settings: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);

    const displayValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return value;
    };

    const openEditModal = () => {
        if (!organization) {
            return;
        }
        setFormErrors({});
        setSaveError(null);
        setSaveNotice(null);
        setEditForm({
            name: organization.name || '',
            slug: organization.slug || '',
            parent_id:
                organization.parent_id !== undefined && organization.parent_id !== null
                    ? String(organization.parent_id)
                    : '',
            description: organization.description || '',
            billing_tier: organization.billing_tier || '',
            status: organization.status || 'active',
            max_users:
                organization.max_users !== undefined && organization.max_users !== null
                    ? String(organization.max_users)
                    : '',
            max_resources:
                organization.max_resources !== undefined && organization.max_resources !== null
                    ? String(organization.max_resources)
                    : '',
            metadata: prettyPrintJSON(organization.metadata || '{}'),
            settings: prettyPrintJSON(organization.settings || '{}'),
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        if (isSaving) {
            return;
        }
        setIsEditModalOpen(false);
    };

    const handleFieldChange = (field, value) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const parseJsonForSubmit = (rawValue, fallback = '{}') => {
        const trimmed = rawValue?.trim();
        if (!trimmed) {
            return fallback;
        }
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed);
    };

    const normalizeNumberField = (value) => {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            return NaN;
        }
        return Math.floor(parsed);
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = {};

        if (!editForm.name.trim()) {
            validationErrors.name = 'Name is required';
        }

        let metadataPayload;
        try {
            metadataPayload = parseJsonForSubmit(editForm.metadata, '{}');
        } catch (jsonError) {
            validationErrors.metadata = 'Metadata must be valid JSON';
        }

        let settingsPayload;
        try {
            settingsPayload = parseJsonForSubmit(editForm.settings, '{}');
        } catch (jsonError) {
            validationErrors.settings = 'Settings must be valid JSON';
        }

        const maxUsersValue = normalizeNumberField(editForm.max_users);
        if (Number.isNaN(maxUsersValue) || (maxUsersValue !== null && maxUsersValue < 0)) {
            validationErrors.max_users = 'Max users must be a non-negative number';
        }

        const maxResourcesValue = normalizeNumberField(editForm.max_resources);
        if (Number.isNaN(maxResourcesValue) || (maxResourcesValue !== null && maxResourcesValue < 0)) {
            validationErrors.max_resources = 'Max resources must be a non-negative number';
        }

        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setFormErrors({});
        setIsSaving(true);
        setSaveError(null);

        const slugValue = editForm.slug?.trim() || '';
        const parentIdValue = editForm.parent_id?.trim() || '';

        const payload = {
            name: editForm.name.trim(),
            slug: slugValue !== '' ? slugValue : organization?.slug || '',
            parent_id: parentIdValue === '' ? null : parentIdValue,
            description: editForm.description.trim() === '' ? null : editForm.description.trim(),
            billing_tier: editForm.billing_tier.trim() || organization?.billing_tier || 'free',
            status: editForm.status.trim() || organization?.status || 'active',
            max_users: maxUsersValue !== null ? maxUsersValue : organization?.max_users,
            max_resources: maxResourcesValue !== null ? maxResourcesValue : organization?.max_resources,
            metadata: metadataPayload,
            settings: settingsPayload,
        };

        try {
            await organizationAPI.update(id, payload);
            await fetchOrganizationData({ showSpinner: false });
            setIsEditModalOpen(false);
            setSaveNotice('Organization updated successfully.');
            setTimeout(() => setSaveNotice(null), 4000);
        } catch (updateError) {
            const apiMessage =
                updateError.response?.data?.message || updateError.message || 'Failed to update organization';
            setSaveError(apiMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const displayTimestamp = (value) => {
        if (!value) {
            return '—';
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    };

    const formatJSON = (value) => {
        if (!value) {
            return '—';
        }
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return JSON.stringify(parsed, null, 2);
        } catch (err) {
            return String(value);
        }
    };

    const prettyPrintJSON = (value) => {
        if (!value) {
            return '{}';
        }
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return JSON.stringify(parsed, null, 2);
        } catch (err) {
            return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        }
    };

    useEffect(() => {
        fetchOrganizationData();
    }, [id]);

    const parseJSON = (value) => {
        if (!value) {
            return null;
        }
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (err) {
            console.warn('Failed to parse JSON field:', err);
            return null;
        }
    };

    const fetchOrganizationData = async ({ showSpinner = true } = {}) => {
        if (showSpinner) {
            setLoading(true);
        }
        setError(null);
        try {
            const [
                orgRes,
                usersRes,
                groupsRes,
                rolesRes,
                policiesRes,
                resourcesRes,
                settingsRes,
            ] = await Promise.all([
                organizationAPI.get(id),
                organizationAPI.getUsers(id),
                organizationAPI.getGroups(id),
                organizationAPI.getRoles(id),
                organizationAPI.getPolicies(id),
                organizationAPI.getResources(id),
                organizationAPI.getSettings(id),
            ]);

            const orgData = orgRes?.data?.data;
            if (!orgData) {
                throw new Error('Organization payload missing');
            }

            setOrganization(orgData);
            setUsers(usersRes.data.data.users || []);
            setGroups(groupsRes.data.data.groups || []);
            setRoles(rolesRes.data.data.roles || []);
            setPolicies(policiesRes.data.data.policies || []);
            setResources(resourcesRes.data.data.resources || []);
            setOrgSettings(parseJSON(settingsRes.data.data.settings) || {});
        } catch (fetchError) {
            console.error('Failed to fetch organization data:', fetchError);
            setOrganization(null);
            setUsers([]);
            setGroups([]);
            setRoles([]);
            setPolicies([]);
            setResources([]);
            setOrgSettings({});
            setError('Unable to load organization details. Please try again.');
        } finally {
            if (showSpinner) {
                setLoading(false);
            }
        }
    };

    const editModal = null; // Not used, modal rendered inline

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return (
            <>
                <div className="dashboard-layout">
                    <Sidebar user={user} onLogout={logout} />
                    <main className="dashboard-main">
                        <div className="error-state">
                            <h2>Unable to load organization</h2>
                            <p>{error}</p>
                            <button className="btn-secondary" onClick={fetchOrganizationData}>
                                Retry
                            </button>
                            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                                ← Back to Organizations
                            </button>
                        </div>
                    </main>
                </div>
                {editModal}
            </>
        );
    }

    if (!organization) {
        return null;
    }

    const org = organization;
    const metadata = parseJSON(org.metadata);
    const orgSettingsParsed = parseJSON(org.settings);
    const metadataEntries = metadata && Object.entries(metadata);
    const settingsEntries = orgSettingsParsed && Object.entries(orgSettingsParsed);

    const overviewCards = [
        {
            title: 'Organization Details',
            fields: [
                { label: 'Name', value: displayValue(org.name) },
                { label: 'ID', value: displayValue(org.id) },
                { label: 'Slug', value: displayValue(org.slug) },
                { label: 'Status', value: displayValue(org.status), badge: true },
                { label: 'Billing Tier', value: displayValue(org.billing_tier) },
                { label: 'Parent Organization', value: displayValue(org.parent_id) },
            ],
        },
        {
            title: 'Business Profile',
            fields: [
                { label: 'Domain', value: displayValue(org.domain) },
                { label: 'Website', value: displayValue(org.website) },
                { label: 'Industry', value: displayValue(org.industry) },
                { label: 'Organization Size', value: displayValue(org.size) },
                { label: 'Country', value: displayValue(org.country) },
                { label: 'Timezone', value: displayValue(org.timezone) },
                { label: 'Language', value: displayValue(org.language) },
            ],
        },
        {
            title: 'Contact & Support',
            fields: [
                { label: 'Billing Email', value: displayValue(org.billing_email) },
                { label: 'Support Email', value: displayValue(org.support_email) },
                { label: 'Phone', value: displayValue(org.phone) },
                { label: 'Address', value: displayValue(org.address) },
            ],
        },
        {
            title: 'Lifecycle',
            fields: [
                { label: 'Created At', value: displayTimestamp(org.created_at) },
                { label: 'Updated At', value: displayTimestamp(org.updated_at) },
                { label: 'Deleted At', value: displayTimestamp(org.deleted_at) },
            ],
        },
        {
            title: 'Limits & Allocation',
            fields: [
                { label: 'Max Users', value: displayValue(org.max_users) },
                { label: 'Max Resources', value: displayValue(org.max_resources) },
                { label: 'Usage Model', value: displayValue(org.usage_model) },
            ],
        },
    ];

    return (
        <>
            <div className="dashboard-layout">
                <Sidebar user={user} onLogout={logout} />

                <main className="dashboard-main">
                    <div className="org-detail-header">
                        <div className="org-header-row">
                            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                                ← Back to Organizations
                            </button>
                            <button className="btn btn-primary" onClick={openEditModal}>
                                Edit Organization
                            </button>
                        </div>
                        <h1>{org?.name}</h1>
                        <p>{displayValue(org?.description)}</p>
                        {saveNotice && <div className="inline-alert inline-alert-success">{saveNotice}</div>}
                    </div>

                    <div className="tabs">
                        <button
                            className={activeTab === 'overview' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={activeTab === 'users' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('users')}
                        >
                            Users ({users.length})
                        </button>
                        <button
                            className={activeTab === 'groups' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('groups')}
                        >
                            Groups ({groups.length})
                        </button>
                        <button
                            className={activeTab === 'roles' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('roles')}
                        >
                            Roles ({roles.length})
                        </button>
                        <button
                            className={activeTab === 'policies' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('policies')}
                        >
                            Policies ({policies.length})
                        </button>
                        <button
                            className={activeTab === 'resources' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('resources')}
                        >
                            Resources ({resources.length})
                        </button>
                        <button
                            className={activeTab === 'settings' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('settings')}
                        >
                            Settings
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-section">
                                {overviewCards.map((card) => (
                                    <div key={card.title} className="info-card">
                                        <h3>{card.title}</h3>
                                        <div className="info-grid">
                                            {card.fields.map((field) => (
                                                <div key={field.label}>
                                                    <strong>{field.label}</strong>
                                                    {field.badge ? (
                                                        <span className="badge">{field.value}</span>
                                                    ) : (
                                                        field.value
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="info-card">
                                    <h3>Description</h3>
                                    <p className="paragraph-text">{displayValue(org.description)}</p>
                                </div>

                                <div className="info-card">
                                    <h3>Metadata</h3>
                                    {metadataEntries && metadataEntries.length > 0 ? (
                                        <div className="key-value-grid">
                                            {metadataEntries.map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No metadata configured</p>
                                    )}
                                    <pre className="json-preview">{formatJSON(org.metadata)}</pre>
                                </div>

                                <div className="info-card">
                                    <h3>Settings</h3>
                                    {settingsEntries && settingsEntries.length > 0 ? (
                                        <div className="key-value-grid">
                                            {settingsEntries.map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No settings configured</p>
                                    )}
                                    <pre className="json-preview">{formatJSON(org.settings)}</pre>
                                </div>

                                <div className="info-card">
                                    <h3>Raw Response</h3>
                                    <pre className="json-preview">{JSON.stringify(org, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Display Name</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>{user.username}</td>
                                                <td>{user.email}</td>
                                                <td>{user.display_name}</td>
                                                <td><span className="badge">{user.status}</span></td>
                                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {users.length === 0 && <p className="empty-message">No users found</p>}
                            </div>
                        )}

                        {activeTab === 'groups' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((group) => (
                                            <tr key={group.id}>
                                                <td>{group.name}</td>
                                                <td>{group.description}</td>
                                                <td>{group.group_type}</td>
                                                <td><span className="badge">{group.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {groups.length === 0 && <p className="empty-message">No groups found</p>}
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.map((role) => (
                                            <tr key={role.id}>
                                                <td>{role.name}</td>
                                                <td>{role.description}</td>
                                                <td>{role.role_type}</td>
                                                <td><span className="badge">{role.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {roles.length === 0 && <p className="empty-message">No roles found</p>}
                            </div>
                        )}

                        {activeTab === 'policies' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Type</th>
                                            <th>Effect</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {policies.map((policy) => (
                                            <tr key={policy.id}>
                                                <td>{policy.name}</td>
                                                <td>{policy.description}</td>
                                                <td>{policy.policy_type}</td>
                                                <td><span className="badge">{policy.effect}</span></td>
                                                <td><span className="badge">{policy.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {policies.length === 0 && <p className="empty-message">No policies found</p>}
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>ARN</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resources.map((resource) => (
                                            <tr key={resource.id}>
                                                <td>{resource.name}</td>
                                                <td>{resource.type}</td>
                                                <td>{resource.arn}</td>
                                                <td><span className="badge">{resource.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {resources.length === 0 && <p className="empty-message">No resources found</p>}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="settings-section">
                                <div className="settings-header">
                                    <h3>Organization Settings</h3>
                                    <button className="btn btn-primary" onClick={() => setActiveTab('settings-edit')}>
                                        Edit Settings
                                    </button>
                                </div>
                                <div className="info-card">
                                    <h4>Current Settings</h4>
                                    {Object.keys(orgSettings).length > 0 ? (
                                        <div className="key-value-grid">
                                            {Object.entries(orgSettings).map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No settings configured</p>
                                    )}
                                    <pre className="json-preview">{JSON.stringify(orgSettings, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings-edit' && <SettingsEditTab orgId={id} currentSettings={orgSettings} onSave={() => { setActiveTab('settings'); fetchOrganizationData({ showSpinner: false }); }} onCancel={() => setActiveTab('settings')} />}
                    </div>
                </main>
            </div>
            {isEditModalOpen && (
                <div
                    className="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-organization-title"
                    onClick={closeEditModal}
                >
                    <div
                        className="modal-content org-edit-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2 id="edit-organization-title">Edit Organization</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeEditModal}
                                disabled={isSaving}
                            >
                                ×
                            </button>
                        </div>
                        <form className="org-edit-form" onSubmit={handleEditSubmit}>
                            <div className="org-edit-grid">
                                <div className="form-group">
                                    <label htmlFor="org-name-input">Name *</label>
                                    <input
                                        id="org-name-input"
                                        type="text"
                                        value={editForm.name}
                                        onChange={(event) => handleFieldChange('name', event.target.value)}
                                        required
                                    />
                                    {formErrors.name && <p className="field-error">{formErrors.name}</p>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-slug-input">Slug</label>
                                    <input
                                        id="org-slug-input"
                                        type="text"
                                        value={editForm.slug}
                                        onChange={(event) => handleFieldChange('slug', event.target.value)}
                                        placeholder="auto-generate from name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-parent-input">Parent ID</label>
                                    <input
                                        id="org-parent-input"
                                        type="text"
                                        value={editForm.parent_id}
                                        onChange={(event) => handleFieldChange('parent_id', event.target.value)}
                                        placeholder="optional parent identifier"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-status-input">Status</label>
                                    <input
                                        id="org-status-input"
                                        type="text"
                                        value={editForm.status}
                                        onChange={(event) => handleFieldChange('status', event.target.value)}
                                        placeholder="active"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-billing-tier-input">Billing Tier</label>
                                    <input
                                        id="org-billing-tier-input"
                                        type="text"
                                        value={editForm.billing_tier}
                                        onChange={(event) => handleFieldChange('billing_tier', event.target.value)}
                                        placeholder="free"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-max-users-input">Max Users</label>
                                    <input
                                        id="org-max-users-input"
                                        type="number"
                                        min="0"
                                        value={editForm.max_users}
                                        onChange={(event) => handleFieldChange('max_users', event.target.value)}
                                    />
                                    {formErrors.max_users && <p className="field-error">{formErrors.max_users}</p>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="org-max-resources-input">Max Resources</label>
                                    <input
                                        id="org-max-resources-input"
                                        type="number"
                                        min="0"
                                        value={editForm.max_resources}
                                        onChange={(event) => handleFieldChange('max_resources', event.target.value)}
                                    />
                                    {formErrors.max_resources && (
                                        <p className="field-error">{formErrors.max_resources}</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="org-description-input">Description</label>
                                <textarea
                                    id="org-description-input"
                                    rows="3"
                                    value={editForm.description}
                                    onChange={(event) => handleFieldChange('description', event.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="org-metadata-input">Metadata (JSON)</label>
                                <textarea
                                    id="org-metadata-input"
                                    className="json-input"
                                    rows="6"
                                    value={editForm.metadata}
                                    onChange={(event) => handleFieldChange('metadata', event.target.value)}
                                />
                                <p className="field-help">Provide a valid JSON object describing custom metadata.</p>
                                {formErrors.metadata && <p className="field-error">{formErrors.metadata}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="org-settings-input">Settings (JSON)</label>
                                <textarea
                                    id="org-settings-input"
                                    className="json-input"
                                    rows="6"
                                    value={editForm.settings}
                                    onChange={(event) => handleFieldChange('settings', event.target.value)}
                                />
                                <p className="field-help">Provide a valid JSON object for organization settings.</p>
                                {formErrors.settings && <p className="field-error">{formErrors.settings}</p>}
                            </div>

                            {saveError && <div className="save-error">{saveError}</div>}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={closeEditModal}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-save" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

const SettingsEditTab = ({ orgId, currentSettings, onSave, onCancel }) => {
    const [settingsJson, setSettingsJson] = useState(JSON.stringify(currentSettings, null, 2));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const parsedSettings = JSON.parse(settingsJson);
            await organizationAPI.updateSettings(orgId, parsedSettings);
            setSuccess('Settings updated successfully');
            setTimeout(() => onSave(), 1500);
        } catch (err) {
            if (err instanceof SyntaxError) {
                setError('Invalid JSON format');
            } else {
                setError(err.response?.data?.message || 'Failed to update settings');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-edit-section">
            <div className="settings-header">
                <h3>Edit Organization Settings</h3>
            </div>
            <div className="form-group">
                <label htmlFor="settings-json">Settings (JSON)</label>
                <textarea
                    id="settings-json"
                    className="json-input"
                    rows="15"
                    value={settingsJson}
                    onChange={(e) => setSettingsJson(e.target.value)}
                    placeholder='{"key": "value"}'
                />
                <p className="field-help">Provide a valid JSON object for organization settings.</p>
            </div>
            {error && <div className="save-error">{error}</div>}
            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            <div className="modal-actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-save"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default OrganizationDetail;
