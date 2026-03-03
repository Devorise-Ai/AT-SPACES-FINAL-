import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import api from '../services/api';
import './Bookings.css';

interface Booking {
    id: string;
    dbId: number;
    guestName: string;
    serviceName: string;
    timeSlot: string;
    seats: number;
    status: string;
    paymentStatus: string;
    avatar?: string;
}

const STATUS_MAP: Record<string, string> = {
    'UPCOMING': 'Upcoming',
    'CONFIRMED': 'Upcoming',
    'PENDING': 'Pending',
    'CHECKED_IN': 'Checked In',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'NO_SHOW': 'No-Show',
};

const PAYMENT_MAP: Record<string, string> = {
    'PAID': 'Paid',
    'PENDING': 'Pending',
    'REFUNDED': 'Refunded',
    'UNPAID': 'Unpaid',
};

const Bookings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [selectedDate, setSelectedDate] = useState('');

    const mapBookings = (rawData: any[]): Booking[] => {
        return rawData.map((b: any) => {
            const customerEmail = b.customer?.email ?? 'Guest';
            const guestName = customerEmail.split('@')[0];
            const displayName = guestName.charAt(0).toUpperCase() + guestName.slice(1);
            const serviceName = b.vendorService?.service?.name ?? 'Service';
            const startTime = b.startTime ? new Date(b.startTime) : null;
            const endTime = b.startTime && b.duration
                ? new Date(new Date(b.startTime).getTime() + b.duration * 60 * 60 * 1000)
                : null;
            const timeSlot = startTime
                ? `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}`
                : 'TBD';

            return {
                id: b.bookingNumber ?? `BK-${String(b.id).padStart(4, '0')}`,
                dbId: b.id,
                guestName: displayName,
                serviceName,
                timeSlot,
                status: STATUS_MAP[b.bookingStatus] ?? b.bookingStatus ?? 'Pending',
                seats: b.numPeople ?? 1,
                paymentStatus: PAYMENT_MAP[b.paymentStatus] ?? b.paymentStatus ?? 'Pending',
                avatar: displayName.slice(0, 2).toUpperCase(),
            };
        });
    };

    const filterByDate = (raw: any[], date: string) => {
        if (!date) return raw;
        return raw.filter((b: any) => {
            const bDate = b.startTime ? new Date(b.startTime).toISOString().split('T')[0] : '';
            return bDate === date;
        });
    };

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await api.get('/vendor/bookings');
                const raw = Array.isArray(response.data) ? response.data : [];
                setAllBookings(raw);
                setBookings(mapBookings(filterByDate(raw, selectedDate)));
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        setBookings(mapBookings(filterByDate(allBookings, date)));
    };

    const handleAction = async (dbId: number, action: 'checkin' | 'checkout') => {
        try {
            const status = action === 'checkin' ? 'CHECKED_IN' : 'COMPLETED';
            await api.patch(`/vendor/bookings/${dbId}/status`, { status });
            // Refresh bookings after action
            const response = await api.get('/vendor/bookings');
            const raw = Array.isArray(response.data) ? response.data : [];
            setBookings(mapBookings(raw));
        } catch (error) {
            console.error(`Error during ${action}:`, error);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader2 className="spinner" size={48} />
                <p>Loading bookings console...</p>
            </div>
        );
    }

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'All' || b.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="bookings-page">
            <header className="page-header glass">
                <div className="header-left">
                    <h1>Bookings Console</h1>
                    <p>Live overview of today's guest arrivals and workspace usage.</p>
                </div>
                <div className="header-actions">
                    <div className="date-picker glass">
                        <CalendarIcon size={16} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="date-input"
                        />
                        {selectedDate && (
                            <button className="clear-date" onClick={() => handleDateChange('')} title="Show all dates">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="bookings-controls glass">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by guest name, ID, or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <button
                        className={`filter-btn ${filter === 'All' ? 'active' : ''}`}
                        onClick={() => setFilter('All')}
                    >All Bookings</button>
                    <button
                        className={`filter-btn ${filter === 'Pending' ? 'active' : ''}`}
                        onClick={() => setFilter('Pending')}
                    >Pending</button>
                    <button
                        className={`filter-btn ${filter === 'Checked In' ? 'active' : ''}`}
                        onClick={() => setFilter('Checked In')}
                    >Checked In</button>
                    <button
                        className={`filter-btn ${filter === 'Completed' ? 'active' : ''}`}
                        onClick={() => setFilter('Completed')}
                    >Completed</button>
                    <div className="divider"></div>
                    <button className="advanced-filter">
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            <div className="bookings-table-wrapper glass">
                <table className="bookings-table">
                    <thead>
                        <tr>
                            <th>Guest / ID</th>
                            <th>Service</th>
                            <th>Time Slot</th>
                            <th>Status</th>
                            <th>Seats</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBookings.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                                    No bookings found.
                                </td>
                            </tr>
                        ) : (
                            filteredBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td>
                                        <div className="guest-info">
                                            <div className="guest-avatar">{booking.avatar}</div>
                                            <div className="guest-details">
                                                <strong>{booking.guestName}</strong>
                                                <span>{booking.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="service-tag">{booking.serviceName}</span>
                                    </td>
                                    <td>
                                        <div className="time-info">
                                            <Clock size={14} /> {booking.timeSlot}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${booking.status.replace(' ', '-').toLowerCase()}`}>
                                            {booking.status === 'Checked In' && <CheckCircle2 size={12} />}
                                            {booking.status === 'No-Show' && <AlertCircle size={12} />}
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td>{booking.seats}</td>
                                    <td>
                                        <span className={`payment-status ${booking.paymentStatus.toLowerCase()}`}>
                                            {booking.paymentStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {booking.status === 'Upcoming' && (
                                                <button
                                                    className="checkin-primary"
                                                    onClick={() => handleAction(booking.dbId, 'checkin')}
                                                >Check In</button>
                                            )}
                                            {booking.status === 'Checked In' && (
                                                <button
                                                    className="checkout-secondary"
                                                    onClick={() => handleAction(booking.dbId, 'checkout')}
                                                >Check Out</button>
                                            )}
                                            <button className="more-btn">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Bookings;
