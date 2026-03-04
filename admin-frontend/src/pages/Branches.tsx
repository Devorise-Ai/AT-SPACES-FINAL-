import React, { useEffect, useState } from 'react';
import { Search, Building2, MapPin } from 'lucide-react';
import { getBranches, updateBranchStatus, getBranchDetails } from '../services/admin.service';
import './Branches.css';

const STATUS_TABS = ['ALL', 'ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'];

const Branches: React.FC = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchBranches = async (status?: string) => {
        setLoading(true);
        try {
            const data = await getBranches(status === 'ALL' ? undefined : status);
            setBranches(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBranches(activeTab); }, [activeTab]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSelected(null);
    };

    const handleStatusChange = async (id: number, status: string) => {
        try {
            await updateBranchStatus(id, status);
            fetchBranches(activeTab);
            if (selected?.id === id) {
                const updated = await getBranchDetails(id);
                setSelected(updated);
            }
        } catch (e) { console.error(e); }
    };

    const handleViewDetails = async (id: number) => {
        try {
            const data = await getBranchDetails(id);
            setSelected(data);
        } catch (e) { console.error(e); }
    };

    const filtered = branches.filter(b =>
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.location?.toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (status: string) => {
        const cls = status === 'ACTIVE' ? 'badge-success' : status === 'SUSPENDED' ? 'badge-danger' : 'badge-warning';
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div className="branches-page">
            <div className="page-header">
                <div>
                    <h1>Branch Management</h1>
                    <p className="subtitle">Monitor and manage all branches across the network.</p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="status-tabs">
                    {STATUS_TABS.map(t => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => handleTabChange(t)}>
                            {t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="search-input">
                    <Search size={16} />
                    <input placeholder="Search branches..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="branches-layout">
                <div className="branches-list">
                    {loading ? <p className="muted">Loading...</p> : filtered.length === 0 ? <p className="muted">No branches found.</p> : (
                        filtered.map((b: any) => (
                            <div className={`branch-card card ${selected?.id === b.id ? 'selected' : ''}`} key={b.id} onClick={() => handleViewDetails(b.id)}>
                                <div className="branch-card-top">
                                    <div className="branch-card-icon"><Building2 size={18} /></div>
                                    <div className="branch-card-info">
                                        <strong>{b.name}</strong>
                                        <small><MapPin size={12} /> {b.location || 'N/A'}</small>
                                    </div>
                                    {statusBadge(b.status)}
                                </div>
                                <div className="branch-card-meta">
                                    <span>Occupancy: <strong>{b.occupancyRate}%</strong></span>
                                    <span>Vendor: <strong>{b.vendor?.businessName || b.vendor?.email || 'N/A'}</strong></span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {selected && (
                    <div className="branch-detail card">
                        <h3>{selected.name}</h3>
                        <p className="detail-subtitle"><MapPin size={14} /> {selected.location || 'Unknown'}</p>
                        {statusBadge(selected.status)}

                        <div className="detail-stats">
                            <div className="detail-stat">
                                <span>Total Bookings</span>
                                <strong>{selected.statistics?.totalBookings || 0}</strong>
                            </div>
                            <div className="detail-stat">
                                <span>Completed</span>
                                <strong>{selected.statistics?.completedBookings || 0}</strong>
                            </div>
                            <div className="detail-stat">
                                <span>Revenue</span>
                                <strong>{selected.statistics?.totalRevenue || 0} JOD</strong>
                            </div>
                        </div>

                        <div className="detail-actions">
                            {selected.status !== 'ACTIVE' && (
                                <button className="btn-primary" onClick={() => handleStatusChange(selected.id, 'ACTIVE')}>Activate</button>
                            )}
                            {selected.status !== 'SUSPENDED' && (
                                <button className="btn-secondary danger-btn" onClick={() => handleStatusChange(selected.id, 'SUSPENDED')}>Suspend</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Branches;
