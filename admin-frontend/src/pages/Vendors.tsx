import React, { useEffect, useState } from 'react';
import { Search, Users, MapPin } from 'lucide-react';
import { getVendors, updateVendorStatus, getVendorDetails } from '../services/admin.service';
import './Vendors.css';

const STATUS_TABS = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'];

const Vendors: React.FC = () => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchVendors = async (status?: string) => {
        setLoading(true);
        try {
            const data = await getVendors(status === 'ALL' ? undefined : status);
            setVendors(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchVendors(activeTab); }, [activeTab]);

    const handleTabChange = (tab: string) => { setActiveTab(tab); setSelected(null); };

    const handleStatusChange = async (id: number, status: string) => {
        try {
            await updateVendorStatus(id, status);
            fetchVendors(activeTab);
            if (selected?.id === id) {
                const updated = await getVendorDetails(id);
                setSelected(updated);
            }
        } catch (e) { console.error(e); }
    };

    const handleViewDetails = async (id: number) => {
        try {
            const data = await getVendorDetails(id);
            setSelected(data);
        } catch (e) { console.error(e); }
    };

    const filtered = vendors.filter(v =>
        v.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        v.email?.toLowerCase().includes(search.toLowerCase()) ||
        v.ownerName?.toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (status: string) => {
        const cls = status === 'ACTIVE' ? 'badge-success' : status === 'SUSPENDED' ? 'badge-danger' : 'badge-warning';
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div className="vendors-page">
            <div className="page-header">
                <div>
                    <h1>Vendor Management</h1>
                    <p className="subtitle">Oversee and manage all vendors on the AtSpaces network.</p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="status-tabs">
                    {STATUS_TABS.map(t => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => handleTabChange(t)}>{t}</button>
                    ))}
                </div>
                <div className="search-input">
                    <Search size={16} />
                    <input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="branches-layout">
                <div className="branches-list">
                    {loading ? <p className="muted">Loading...</p> : filtered.length === 0 ? <p className="muted">No vendors found.</p> : (
                        filtered.map((v: any) => (
                            <div className={`branch-card card ${selected?.id === v.id ? 'selected' : ''}`} key={v.id} onClick={() => handleViewDetails(v.id)}>
                                <div className="branch-card-top">
                                    <div className="branch-card-icon"><Users size={18} /></div>
                                    <div className="branch-card-info">
                                        <strong>{v.businessName || v.email}</strong>
                                        <small>{v.ownerName || 'N/A'}</small>
                                    </div>
                                    {statusBadge(v.status)}
                                </div>
                                <div className="branch-card-meta">
                                    <span>Branches: <strong>{v.branches?.length || 0}</strong></span>
                                    <span>License: <strong>{v.tradeLicenseNumber || 'N/A'}</strong></span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {selected && (
                    <div className="branch-detail card">
                        <h3>{selected.businessName || selected.email}</h3>
                        <p className="detail-subtitle"><MapPin size={14} /> {selected.branchAddress || 'N/A'}</p>
                        {statusBadge(selected.status)}

                        <div className="vendor-meta">
                            <div><span>Owner:</span> <strong>{selected.ownerName || 'N/A'}</strong></div>
                            <div><span>Email:</span> <strong>{selected.email}</strong></div>
                            <div><span>Phone:</span> <strong>{selected.phoneNumber || 'N/A'}</strong></div>
                            <div><span>License:</span> <strong>{selected.tradeLicenseNumber || 'N/A'}</strong></div>
                        </div>

                        {selected.reliabilityIndicators && (
                            <div className="detail-stats">
                                <div className="detail-stat">
                                    <span>Total Bookings</span>
                                    <strong>{selected.reliabilityIndicators.totalBookings}</strong>
                                </div>
                                <div className="detail-stat">
                                    <span>Completion Rate</span>
                                    <strong>{selected.reliabilityIndicators.completionRate}%</strong>
                                </div>
                                <div className="detail-stat">
                                    <span>No-Shows</span>
                                    <strong>{selected.reliabilityIndicators.noShowBookings}</strong>
                                </div>
                            </div>
                        )}

                        <div className="detail-actions">
                            {selected.status !== 'ACTIVE' && (
                                <button className="btn-primary" onClick={() => handleStatusChange(selected.id, 'ACTIVE')}>Approve / Activate</button>
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

export default Vendors;
