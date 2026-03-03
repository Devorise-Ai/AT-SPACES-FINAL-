import React, { useEffect, useState } from 'react';
import {
    Users,
    Calendar,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import api from '../services/api';
import './Dashboard.css';

interface DashboardStats {
    todayBookings: number;
    checkedIn: number;
    noShows: number;
    occupancyRate: number;
    previousOccupancyRate: number;
    branchStatus: string;
    serviceBreakdown: Array<{
        name: string;
        booked: number;
        total: number;
        color: string;
    }>;
    upcomingCheckins: Array<{
        id: string;
        name: string;
        service: string;
        time: string;
        initials: string;
    }>;
}

const COLORS = ['#FF5B04', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B'];

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch overview + bookings + services in parallel
                const [overviewRes, bookingsRes, servicesRes] = await Promise.all([
                    api.get('/vendor/overview').catch(() => ({ data: {} })),
                    api.get('/vendor/bookings').catch(() => ({ data: [] })),
                    api.get('/vendor/services').catch(() => ({ data: [] })),
                ]);

                const overview = overviewRes.data || {};
                const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
                const services = Array.isArray(servicesRes.data) ? servicesRes.data : [];

                // Compute stats from real data
                const todayBookings = overview.upcomingBookingsToday ?? bookings.length ?? 0;
                const checkedIn = bookings.filter((b: any) => b.bookingStatus === 'CHECKED_IN').length;
                const noShows = bookings.filter((b: any) => b.bookingStatus === 'NO_SHOW').length;

                // Build service breakdown from vendor services
                const serviceBreakdown = services.map((s: any, i: number) => ({
                    name: s.service?.name ?? s.name ?? `Service ${i + 1}`,
                    booked: (s.capacity ?? 0) - (s.availableCapacity ?? s.capacity ?? 0),
                    total: s.capacity ?? 0,
                    color: COLORS[i % COLORS.length],
                }));

                // Build upcoming check-ins from confirmed bookings
                const upcomingCheckins = bookings
                    .filter((b: any) => b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PENDING' || b.bookingStatus === 'UPCOMING')
                    .slice(0, 5)
                    .map((b: any) => {
                        const customerName = b.customer?.email?.split('@')[0] ?? 'Guest';
                        const displayName = customerName.charAt(0).toUpperCase() + customerName.slice(1);
                        return {
                            id: String(b.id),
                            name: displayName,
                            service: b.vendorService?.service?.name ?? 'Service',
                            time: b.startTime
                                ? new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'TBD',
                            initials: displayName.slice(0, 2).toUpperCase(),
                        };
                    });

                setData({
                    todayBookings,
                    checkedIn,
                    noShows,
                    occupancyRate: overview.occupancyRate ?? 0,
                    previousOccupancyRate: overview.previousOccupancyRate ?? 0,
                    branchStatus: overview.branchStatus === 'ACTIVE' ? 'Calm' : (overview.branchStatus ?? 'Calm'),
                    serviceBreakdown,
                    upcomingCheckins,
                });
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader2 className="spinner" size={48} />
                <p>Loading your spaces...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="dashboard-loading">
                <AlertCircle size={48} color="#FF5B04" />
                <p>{error ?? 'Something went wrong. Please refresh.'}</p>
            </div>
        );
    }

    const stats = [
        {
            label: "Today's Bookings",
            value: data.todayBookings.toString(),
            change: "+3 vs yesterday",
            icon: <Calendar size={20} color="#FF5B04" />,
            trend: "up"
        },
        {
            label: "Checked In",
            value: data.checkedIn.toString(),
            subValue: `of ${data.todayBookings} total`,
            icon: <CheckCircle2 size={20} color="#FF5B04" />
        },
        {
            label: "No-Shows",
            value: data.noShows.toString(),
            subValue: "so far today",
            icon: <AlertCircle size={20} color="#FF5B04" />
        },
        {
            label: "Capacity Used",
            value: `${data.occupancyRate}%`,
            change: "Across all services",
            icon: <Users size={20} color="#FF5B04" />,
            trend: data.occupancyRate >= data.previousOccupancyRate ? "up" : "down"
        },
    ];

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="dashboard">
            <header className="dashboard-header glass">
                <div className="header-info">
                    <span className="current-date">{dateStr}</span>
                    <h1 className="welcome-text">
                        {greeting}, Vendor 👋
                    </h1>
                    <p className="branch-location">AT Spaces Central — Amman</p>
                </div>
                <div className="branch-status">
                    <div className={`status-indicator ${data.branchStatus.toLowerCase()}`}></div>
                    <div className="status-text">
                        <strong>{data.branchStatus}</strong>
                        <span>{data.occupancyRate}% occupied today</span>
                    </div>
                </div>
            </header>

            <section className="stats-grid">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card glass">
                        <div className="stat-header">
                            <span className="stat-label">{stat.label}</span>
                            <div className="stat-icon-wrapper">{stat.icon}</div>
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        {stat.change && (
                            <div className={`stat-change ${stat.trend}`}>
                                {stat.trend === 'up' && <TrendingUp size={14} />}
                                {stat.change}
                            </div>
                        )}
                        {stat.subValue && <div className="stat-sub">{stat.subValue}</div>}
                    </div>
                ))}
            </section>

            <div className="dashboard-grid">
                <section className="service-breakdown glass">
                    <div className="section-header">
                        <h3>Service Breakdown</h3>
                        <Users size={18} className="grey-icon" />
                    </div>
                    <div className="services-list">
                        {data.serviceBreakdown.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No services configured yet.</p>
                        ) : (
                            data.serviceBreakdown.map((service, i) => {
                                const percentage = service.total > 0 ? (service.booked / service.total) * 100 : 0;
                                return (
                                    <div key={i} className="service-item">
                                        <div className="service-info">
                                            <span>{service.name}</span>
                                            <span className="service-count">{service.booked} / {service.total}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${percentage}%`, backgroundColor: service.color }}
                                            ></div>
                                        </div>
                                        <div className="service-percentage">{Math.round(percentage)}% booked</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="upcoming-checkins glass">
                    <div className="section-header">
                        <h3>Upcoming Check-Ins</h3>
                        <a href="/bookings" className="view-all">View all <ArrowUpRight size={14} /></a>
                    </div>
                    <div className="checkins-list">
                        {data.upcomingCheckins.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No upcoming check-ins.</p>
                        ) : (
                            data.upcomingCheckins.map((checkin, i) => (
                                <div key={i} className="checkin-row">
                                    <div className="user-avatar">{checkin.initials}</div>
                                    <div className="checkin-info">
                                        <strong>{checkin.name}</strong>
                                        <span>{checkin.service} · {checkin.time}</span>
                                    </div>
                                    <button className="checkin-btn">Check In</button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
