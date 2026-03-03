import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Users,
    DollarSign,
    Download,
    Calendar as CalendarIcon,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import api from '../services/api';
import './Reports.css';

interface KPIData {
    totalRevenue: number;
    completedBookings: number;
    occupancyRate: number;
}

interface DailyRevenueData {
    name: string;
    revenue: number;
    bookings: number;
}

interface OccupancyData {
    branchName: string;
    currentOccupancy: number;
    dailyTrends: { name: string; bookings: number; occupancy: number }[];
    monthlyAverage: number;
}

const Reports: React.FC = () => {
    const [kpiData, setKpiData] = useState<KPIData | null>(null);
    const [revenueData, setRevenueData] = useState<DailyRevenueData[]>([]);
    const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [kpiRes, revenueRes, occupancyRes] = await Promise.all([
                    api.get('/vendor/reports/overview'),
                    api.get('/vendor/reports/revenue'),
                    api.get('/vendor/reports/occupancy'),
                ]);
                setKpiData(kpiRes.data);
                setRevenueData(revenueRes.data);
                setOccupancyData(occupancyRes.data);
            } catch (err) {
                console.error('Failed to fetch reports data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const formatCurrency = (val: number) => `SAR ${val.toLocaleString()}`;

    const kpis = kpiData
        ? [
            {
                label: 'Total Revenue',
                value: formatCurrency(kpiData.totalRevenue),
                icon: <DollarSign size={20} />,
                trend: 'up',
                change: 'All time'
            },
            {
                label: 'Occupancy Rate',
                value: `${kpiData.occupancyRate.toFixed(1)}%`,
                icon: <TrendingUp size={20} />,
                trend: kpiData.occupancyRate >= 50 ? 'up' : 'down',
                change: 'Current'
            },
            {
                label: 'Completed Bookings',
                value: kpiData.completedBookings.toString(),
                icon: <Users size={20} />,
                trend: 'up',
                change: 'All time'
            },
        ]
        : [];

    const chartData = revenueData.length > 0 ? revenueData : occupancyData?.dailyTrends ?? [];

    if (loading) {
        return (
            <div className="reports-page">
                <div className="dashboard-loading">
                    <Loader2 className="spinner" size={32} />
                    <p>Loading Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <header className="page-header glass">
                <div className="header-left">
                    <h1>Analytics &amp; Insights</h1>
                    <p>Track your branch performance and revenue growth.</p>
                </div>
                <div className="header-actions">
                    <button className="export-btn glass">
                        <Download size={16} /> Export CSV
                    </button>
                    <div className="date-range glass">
                        <CalendarIcon size={16} /> Last 7 Days
                    </div>
                </div>
            </header>

            <div className="kpi-grid">
                {kpis.map((kpi, i) => (
                    <div key={i} className="kpi-card glass">
                        <div className="kpi-header">
                            <div className="kpi-icon">{kpi.icon}</div>
                            <span className={`kpi-change ${kpi.trend}`}>{kpi.change}</span>
                        </div>
                        <div className="kpi-value">{kpi.value}</div>
                        <div className="kpi-label">{kpi.label}</div>
                    </div>
                ))}
            </div>

            <div className="charts-grid">
                <div className="chart-container glass">
                    <h3>Revenue Growth (SAR)</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF5B04" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FF5B04" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#FF5B04' }}
                                    formatter={(value: number | undefined) => [`SAR ${value ?? 0}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#FF5B04" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container glass">
                    <h3>Daily Bookings</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                />
                                <Bar dataKey="bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
