import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Calendar as CalendarIcon, MapPin, Download, XCircle, Loader2, CheckCircle } from 'lucide-react';
import './Dashboard.css';

interface UserProfile {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email: string;
    phoneNumber?: string;
}

interface Booking {
    id: number;
    branchId: number;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: string;
    branch: {
        name: string;
        location: string;
    };
    service: {
        name: string;
    };
}

const Dashboard: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Edit state
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchDashboardData = async () => {
            try {
                const [profileRes, bookingsRes] = await Promise.all([
                    axios.get('/api/users/profile'),
                    axios.get('/api/bookings/my')
                ]);

                setProfile(profileRes.data);
                setFullName(profileRes.data.fullName || `${profileRes.data.firstName || ''} ${profileRes.data.lastName || ''}`.trim());
                setPhoneNumber(profileRes.data.phoneNumber || '');
                setBookings(bookingsRes.data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [isAuthenticated, navigate]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.put('/api/users/profile', { fullName, phoneNumber });
            setProfile(prev => prev ? { ...prev, fullName, phoneNumber } : null);
            setIsEditing(false);
            setUpdateMessage('Profile updated successfully!');
            setTimeout(() => setUpdateMessage(''), 3000);
        } catch (error: any) {
            setUpdateMessage(error.response?.data?.error || 'Failed to update profile.');
        }
    };

    const handleCancelBooking = async (id: number) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await axios.post(`/api/bookings/${id}/cancel`);
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
        } catch (error) {
            alert('Failed to cancel booking.');
        }
    };

    const handleDownloadICS = async (id: number) => {
        try {
            const response = await axios.get(`/api/bookings/${id}/calendar`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `booking-${id}.ics`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to download calendar invite.');
        }
    };

    const handleGetDirections = async (id: number) => {
        try {
            const response = await axios.get(`/api/bookings/${id}/map`);
            if (response.data.mapUrl) {
                window.open(response.data.mapUrl, '_blank');
            } else {
                alert('Map details not available for this location.');
            }
        } catch (error) {
            alert('Failed to get directions.');
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading container">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    const activeBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

    return (
        <div className="dashboard-page container section">
            <h1 className="dashboard-title">Welcome back, <span className="text-primary">{profile?.fullName || profile?.firstName || 'Explorer'}</span></h1>

            <div className="dashboard-grid">
                {/* Profile Section */}
                <div className="dashboard-sidebar">
                    <div className="glass-panel profile-card">
                        <div className="profile-header">
                            <div className="profile-avatar">
                                <User size={32} />
                            </div>
                            <h3>Your Profile</h3>
                        </div>

                        {updateMessage && <div className="update-msg"><CheckCircle size={16} /> {updateMessage}</div>}

                        {isEditing ? (
                            <form className="profile-form" onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Email (Read-only)</label>
                                    <input type="email" value={profile?.email} disabled />
                                </div>
                                <div className="profile-actions">
                                    <button type="submit" className="btn-primary">Save Changes</button>
                                    <button type="button" className="btn-text" onClick={() => setIsEditing(false)}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="profile-details">
                                <div className="profile-item">
                                    <Mail size={16} className="text-primary" />
                                    <span>{profile?.email}</span>
                                </div>
                                <div className="profile-item">
                                    <Phone size={16} className="text-primary" />
                                    <span>{profile?.phoneNumber || 'Not provided'}</span>
                                </div>
                                <button className="btn-outline mt-4" onClick={() => setIsEditing(true)}>Edit Profile</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bookings Section */}
                <div className="dashboard-main">
                    <div className="bookings-section">
                        <h2>Upcoming Bookings</h2>
                        {activeBookings.length > 0 ? (
                            <div className="bookings-list">
                                {activeBookings.map(booking => (
                                    <div key={booking.id} className="booking-item glass-panel active">
                                        <div className="booking-info">
                                            <h4>{booking.branch.name} - {booking.service.name}</h4>
                                            <p className="booking-location"><MapPin size={14} /> {booking.branch.location}</p>
                                            <div className="booking-time">
                                                <CalendarIcon size={14} className="text-primary" />
                                                <span>
                                                    {new Date(booking.startTime).toLocaleDateString()} &middot; {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="booking-actions">
                                            <div className="booking-status confirmed">Confirmed</div>
                                            <button className="icon-btn" title="Download Calendar" onClick={() => handleDownloadICS(booking.id)}>
                                                <Download size={20} />
                                            </button>
                                            <button className="icon-btn" title="Get Directions" onClick={() => handleGetDirections(booking.id)}>
                                                <MapPin size={20} />
                                            </button>
                                            <button className="icon-btn danger" title="Cancel Booking" onClick={() => handleCancelBooking(booking.id)}>
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state glass-panel">
                                <p>You have no upcoming bookings.</p>
                                <button className="btn-primary mt-4" onClick={() => navigate('/')}>Explore Spaces</button>
                            </div>
                        )}
                    </div>

                    {pastBookings.length > 0 && (
                        <div className="bookings-section mt-5">
                            <h2>Past & Cancelled Bookings</h2>
                            <div className="bookings-list">
                                {pastBookings.map(booking => (
                                    <div key={booking.id} className="booking-item glass-panel inactive">
                                        <div className="booking-info">
                                            <h4>{booking.branch.name} - {booking.service.name}</h4>
                                            <div className="booking-time">
                                                <CalendarIcon size={14} />
                                                <span>{new Date(booking.startTime).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="booking-actions">
                                            <div className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
