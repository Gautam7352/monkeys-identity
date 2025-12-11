import { useState, useEffect } from 'react';
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

    useEffect(() => {
        fetchOrganizationData();
    }, [id]);

    const fetchOrganizationData = async () => {
        try {
            const [orgRes, usersRes, groupsRes, rolesRes, policiesRes, resourcesRes] = await Promise.all([
                organizationAPI.get(id),
                organizationAPI.getUsers(id),
                organizationAPI.getGroups(id),
                organizationAPI.getRoles(id),
                organizationAPI.getPolicies(id),
                organizationAPI.getResources(id),
            ]);

            setOrganization(orgRes.data.data);
            setUsers(usersRes.data.data.users || []);
            setGroups(groupsRes.data.data.groups || []);
            setRoles(rolesRes.data.data.roles || []);
            setPolicies(policiesRes.data.data.policies || []);
            setResources(resourcesRes.data.data.resources || []);
        } catch (error) {
            console.error('Failed to fetch organization data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

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
                            <div className="info-card">
                                <h3>Organization Details</h3>
                                <div className="info-grid">
                                    <div><strong>ID:</strong> {organization.id}</div>
                                    <div><strong>Slug:</strong> {organization.slug}</div>
                                    <div><strong>Status:</strong> <span className="badge">{organization.status}</span></div>
                                    <div><strong>Billing Tier:</strong> {organization.billing_tier}</div>
                                    <div><strong>Max Users:</strong> {organization.max_users}</div>
                                    <div><strong>Max Resources:</strong> {organization.max_resources}</div>
                                    <div><strong>Created:</strong> {new Date(organization.created_at).toLocaleDateString()}</div>
                                    <div><strong>Updated:</strong> {new Date(organization.updated_at).toLocaleDateString()}</div>
                                </div>
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
