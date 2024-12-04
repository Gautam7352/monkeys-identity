import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/OrganizationDetail.css';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const displayValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return value;
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

    const fetchOrganizationData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                orgRes,
                usersRes,
                groupsRes,
                rolesRes,
                policiesRes,
                resourcesRes,
            ] = await Promise.all([
                organizationAPI.get(id),
                organizationAPI.getUsers(id),
                organizationAPI.getGroups(id),
                organizationAPI.getRoles(id),
                organizationAPI.getPolicies(id),
                organizationAPI.getResources(id),
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
        } catch (fetchError) {
            console.error('Failed to fetch organization data:', fetchError);
            setOrganization(null);
            setUsers([]);
            setGroups([]);
            setRoles([]);
            setPolicies([]);
            setResources([]);
            setError('Unable to load organization details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return (
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
        );
    }

    if (!organization) {
        return null;
    }

    const org = organization;
    const metadata = parseJSON(org.metadata);
    const settings = parseJSON(org.settings);
    const metadataEntries = metadata && Object.entries(metadata);
    const settingsEntries = settings && Object.entries(settings);

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
        <div className="dashboard-layout">
            <Sidebar user={user} onLogout={logout} />

            <main className="dashboard-main">
                <div className="org-detail-header">
                    <button className="btn-back" onClick={() => navigate('/dashboard')}>
                        ← Back to Organizations
                    </button>
                    <h1>{organization?.name}</h1>
                    <p>{organization?.description}</p>
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
                </div>
            </main>
        </div>
    );
};

export default OrganizationDetail;
