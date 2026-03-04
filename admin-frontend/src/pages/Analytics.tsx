import React, { useEffect, useState } from 'react';
import { Download, CalendarCheck, TrendingUp, DollarSign, UserX, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getOccupancyAnalytics, getServiceDistribution, getPerformanceIndicators, exportReport } from '../services/admin.service';
import './Analytics.css';

const CHART_COLORS = ['#FF5B04', '#06B6D4', '#10B981', '#8B5CF6', '#EC4899'];

const Analytics: React.FC = () => {
    const [occupancy, setOccupancy] = useState<any>(null);
    const [services, setServices] = useState<any>(null);
    const [performance, setPerformance] = useState<any>(null);
    const [period, setPeriod] = useState('This Month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [occ, svc, perf] = await Promise.all([
                    getOccupancyAnalytics(),
                    getServiceDistribution(),
                    getPerformanceIndicators()
                ]);
                setOccupancy(occ);
                setServices(svc);
                setPerformance(perf);
            } catch (e) {
                console.error('Analytics load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleExport = async () => {
        try {
            const result = await exportReport('csv', 'full');
            alert(`Export ready: ${result.downloadUrl}`);
        } catch (e) {
            console.error('Export error:', e);
        }
    };

    const kpiCards = performance ? [
        { icon: <CalendarCheck size={18} />, value: performance.totalBookings.toLocaleString(), label: 'Total Bookings', trend: '+18%', up: true },
        { icon: <TrendingUp size={18} />, value: `${occupancy?.occupancyByCity?.[0]?.avgOccupancy || 0}%`, label: 'Avg Occupancy', trend: '+5%', up: true },
        { icon: <DollarSign size={18} />, value: `${(performance.totalBookings * 22.8).toFixed(0)} JOD`, label: 'Total Revenue', trend: '+12%', up: true },
        { icon: <UserX size={18} />, value: `${performance.customerMetrics?.repeatPercentage || 0}%`, label: 'No-Show Rate', trend: '-1.3%', up: false },
        { icon: <Receipt size={18} />, value: '22.8 JOD', label: 'Avg Booking Value', trend: '+2%', up: true },
    ] : [];

    if (loading) {
        return <div className="dashboard-loading">Loading analytics...</div>;
    }

    return (
        <div className="analytics">
            <div className="analytics-header">
                <div>
                    <h1>Network Analytics</h1>
                    <p className="subtitle">Data-driven insights across the AtSpaces network.</p>
                </div>
                <div className="analytics-controls">
                    <div className="period-tabs">
                        {['Today', 'This Week', 'This Month', 'Custom'].map(p => (
                            <button key={p} className={`period-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                                {p}
                            </button>
                        ))}
                    </div>
                    <button className="btn-secondary" onClick={handleExport}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                {kpiCards.map((k, i) => (
                    <div className="kpi-card card" key={i}>
                        <div className="kpi-top">
                            <div className="kpi-icon">{k.icon}</div>
                            <span className={`trend ${k.up ? 'up' : 'down'}`}>~{k.trend}</span>
                        </div>
                        <div className="kpi-value">{k.value}</div>
                        <div className="kpi-label">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="card chart-card">
                    <h3>Occupancy by City</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={occupancy?.occupancyByCity || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="city" tick={{ fill: '#9FA3A5', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#9FA3A5', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                                contentStyle={{ background: '#1F2122', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }}
                                formatter={(value: any) => [`${value}%`, 'Occupancy']}
                            />
                            <Bar dataKey="avgOccupancy" fill="#FF5B04" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>Service Usage Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={services?.distribution || []}
                                dataKey="totalBookings"
                                nameKey="serviceName"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={3}
                            >
                                {(services?.distribution || []).map((_: any, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1F2122', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }}
                                formatter={(value: any, name: any) => [value, name]}
                            />
                            <Legend
                                formatter={(value: any) => <span style={{ color: '#CACED0', fontSize: '0.8rem' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
