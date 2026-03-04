import React, { useEffect, useState } from 'react';
import { CalendarCheck, TrendingUp, Building2, DollarSign, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardOverview, getBranches, getPendingRequests } from '../services/admin.service';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [overview, setOverview] = useState<any>(null);
    const [topBranches, setTopBranches] = useState<any[]>([]);
    const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        const load = async () => {
            try {
                const [ov, br, req] = await Promise.all([
                    getDashboardOverview(),
                    getBranches(),
                    getPendingRequests({ status: 'PENDING' })
                ]);
                setOverview(ov);
                const sorted = [...br].sort((a: any, b: any) => b.occupancyRate - a.occupancyRate).slice(0, 5);
                setTopBranches(sorted);
                setPendingAlerts(req.slice(0, 5));
            } catch (e) {
                console.error('Dashboard load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const statCards = overview ? [
        { icon: <CalendarCheck size={20} />, value: overview.totalBookingsToday, label: 'Total Bookings Today', trend: '+12%', up: true },
        { icon: <TrendingUp size={20} />, value: `${overview.overallOccupancy}%`, label: 'Network Occupancy', trend: '+5%', up: true },
        { icon: <Building2 size={20} />, value: overview.activeBranchCount, label: 'Active Branches', trend: '+2', up: true },
        { icon: <DollarSign size={20} />, value: `${(overview.totalBookingsToday * 15.5).toFixed(0)} JOD`, label: 'Revenue Today', trend: '+8%', up: true },
    ] : [];

    const recentActivity = [
        { dot: 'live', title: 'New booking', detail: 'Hot Desk at Amman Downtown Hub', time: '2 min ago' },
        { dot: 'active', title: 'Vendor check-in', detail: '3 guests at Abdali Center', time: '15 min ago' },
        { dot: 'pending', title: 'Pricing updated', detail: 'Meeting Room hourly rate → 12 JOD', time: '1 hr ago' },
        { dot: 'active', title: 'Branch activated', detail: 'Zarqa Tech Park is now live', time: '3 hrs ago' },
        { dot: 'pending', title: 'Application submitted', detail: 'New vendor from Salt', time: '5 hrs ago' },
    ];

    if (loading) {
        return <div className="dashboard-loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>{greeting}, Admin</h1>
                    <p className="subtitle">{dateStr} · Network Status: <span className="status-healthy">Healthy</span></p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards-grid">
                {statCards.map((s, i) => (
                    <div className="stat-card card" key={i}>
                        <div className="stat-card-top">
                            <div className="stat-icon">{s.icon}</div>
                            <span className={`trend ${s.up ? 'up' : 'down'}`}>~{s.trend}</span>
                        </div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {pendingAlerts.length > 0 && (
                <div className="alerts-section">
                    <h3><AlertTriangle size={18} /> Alerts & Actions</h3>
                    <div className="alerts-list">
                        {pendingAlerts.length > 0 && (
                            <div className="alert-item alert-orange" onClick={() => navigate('/approvals')}>
                                <span>{pendingAlerts.length} pending approval request{pendingAlerts.length > 1 ? 's' : ''}</span>
                                <ChevronRight size={18} />
                            </div>
                        )}
                        {topBranches.filter((b: any) => b.status === 'UNDER_REVIEW').length > 0 && (
                            <div className="alert-item alert-yellow" onClick={() => navigate('/branches')}>
                                <span>Branch under review — vendor request pending</span>
                                <ChevronRight size={18} />
                            </div>
                        )}
                        <div className="alert-item" onClick={() => navigate('/approvals')}>
                            <span>{overview?.pendingRequests || 0} new vendor applications received</span>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                </div>
            )}

            {/* Top Branches + Recent Activity */}
            <div className="two-col-grid">
                <div className="card">
                    <div className="card-header">
                        <h3>Top Branches</h3>
                        <button className="link-btn" onClick={() => navigate('/branches')}>View All →</button>
                    </div>
                    <div className="top-branches-list">
                        {topBranches.map((b: any, i: number) => (
                            <div className="branch-row" key={b.id}>
                                <span className="branch-rank">{i + 1}</span>
                                <div className="branch-info">
                                    <strong>{b.name}</strong>
                                    <small>{b.location || 'N/A'}</small>
                                </div>
                                <div className="branch-bar-wrapper">
                                    <div className="branch-bar" style={{ width: `${b.occupancyRate}%` }} />
                                </div>
                                <span className="branch-pct">{b.occupancyRate}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>Recent Activity</h3>
                        <span className="live-indicator"><span className="status-dot live" /> Live</span>
                    </div>
                    <div className="activity-list">
                        {recentActivity.map((a, i) => (
                            <div className="activity-row" key={i}>
                                <span className={`status-dot ${a.dot}`} />
                                <div className="activity-info">
                                    <strong>{a.title}</strong>
                                    <small>{a.detail}</small>
                                </div>
                                <span className="activity-time">{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-grid">
                <div className="quick-action card" onClick={() => navigate('/approvals')}>
                    <div className="qa-icon"><CalendarCheck size={20} /></div>
                    <span>Review Approvals</span>
                    {overview?.pendingRequests > 0 && <span className="qa-badge">{overview.pendingRequests}</span>}
                    <ChevronRight size={18} className="qa-arrow" />
                </div>
                <div className="quick-action card" onClick={() => navigate('/branches')}>
                    <div className="qa-icon"><Building2 size={20} /></div>
                    <span>View All Branches</span>
                    <ChevronRight size={18} className="qa-arrow" />
                </div>
                <div className="quick-action card" onClick={() => navigate('/pricing')}>
                    <div className="qa-icon"><DollarSign size={20} /></div>
                    <span>Manage Pricing</span>
                    <ChevronRight size={18} className="qa-arrow" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
