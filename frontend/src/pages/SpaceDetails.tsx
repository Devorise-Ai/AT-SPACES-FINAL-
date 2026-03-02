import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Users, Wifi, Coffee, ArrowLeft, Loader2, Star, CheckCircle, CalendarDays, Clock, Check, CreditCard, X, Calendar as CalendarIcon } from 'lucide-react';

const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.7 90.5-84.2 102.8-119.5-35.6-13-58.4-44.5-58.4-83.3zM212.1 63.8c23.6-28.8 35-59.5 35-90.8-27.1 2.8-63 17.9-88.5 45.1-23.6 24.6-38.4 58.4-38.4 90.8 28.2 2.2 64.9-15.6 91.9-45.1z" />
    </svg>
);

const MastercardLogo = () => (
    <svg width="32" height="20" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', right: '12px', top: '38px' }}>
        <circle cx="10" cy="10" r="10" fill="#EB001B" />
        <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.8" />
    </svg>
);

const VisaLogo = () => (
    <span style={{ position: 'absolute', right: '12px', top: '36px', color: '#1A1F71', fontWeight: 900, fontStyle: 'italic', fontSize: '14px', background: '#fff', padding: '2px 6px', borderRadius: '4px', letterSpacing: '-0.5px' }}>VISA</span>
);
import { useAuth } from '../context/AuthContext';
import './SpaceDetails.css';

interface Facility {
    name: string;
    description: string;
}

interface ServiceFeature {
    name: string;
    quantity: number;
}

interface VendorService {
    serviceId: number;
    vendorServiceId: number;
    name: string;
    pricePerHour: number;
    pricePerDay: number;
    capacity: string | null;
    features: ServiceFeature[];
}

interface BranchDetails {
    id: number;
    name: string;
    description: string;
    facilities: Facility[];
    services: VendorService[];
}

const mapIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('wifi')) return <Wifi size={20} />;
    if (lower.includes('coffee') || lower.includes('tea')) return <Coffee size={20} />;
    return <CheckCircle size={20} />;
};

const SpaceDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Branch Data State
    const [branch, setBranch] = useState<BranchDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Booking State
    const [selectedService, setSelectedService] = useState<VendorService | null>(null);
    const [date, setDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    const [bookingStatus, setBookingStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'booking' | 'success'>('idle');
    const [bookingMessage, setBookingMessage] = useState<string>('');

    // Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay'>('card');

    // Card State
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^\d ]/g, '');
        val = val.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
        if (val.length > 19) val = val.substring(0, 19);
        setCardNumber(val);
    };

    const getCardType = () => {
        const clean = cardNumber.replace(/\s/g, '');
        if (clean.startsWith('4')) return 'visa';
        if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard';
        return null;
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2);
        }
        setCardExpiry(val);
    };

    const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 3) val = val.substring(0, 3);
        setCardCvv(val);
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await axios.get(`/api/branches/${id}`);
                setBranch(response.data);
            } catch (err: any) {
                setError('Failed to load space details. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchDetails();
        }
    }, [id]);

    const handleCheckAvailability = async () => {
        if (!date || !startTime || !endTime) {
            setBookingMessage('Please select a date and times.');
            return;
        }

        setBookingStatus('checking');
        setBookingMessage('');

        const startISO = new Date(`${date}T${startTime}:00`).toISOString();
        const endISO = new Date(`${date}T${endTime}:00`).toISOString();

        try {
            const response = await axios.post('/api/bookings/check', {
                vendorServiceId: selectedService?.vendorServiceId,
                startTime: startISO,
                endTime: endISO,
                quantity: 1
            });

            if (response.data.available) {
                setBookingStatus('available');
                setBookingMessage('Maximum 2 concurrent cash bookings allowed');
                setTotalPrice(response.data.price || 0);
            } else {
                setBookingStatus('unavailable');
                setBookingMessage(response.data.message || 'Space not available at this time.');
            }
        } catch (err: any) {
            setBookingStatus('unavailable');
            setBookingMessage(err.response?.data?.error || 'Failed to check availability.');
        }
    };

    const handleOpenPaymentModal = () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setShowPaymentModal(true);
    };

    const handleProcessPayment = async () => {
        setBookingStatus('booking');

        const startISO = new Date(`${date}T${startTime}:00`).toISOString();
        const endISO = new Date(`${date}T${endTime}:00`).toISOString();

        try {
            await axios.post('/api/bookings', {
                vendorServiceId: selectedService?.vendorServiceId,
                startTime: startISO,
                endTime: endISO,
                quantity: 1,
                paymentMethod: paymentMethod === 'apple_pay' ? 'APPLE_PAY' : 'CARD'
            });

            setBookingStatus('success');
            setShowPaymentModal(false);
            setShowConfirmationModal(true);
        } catch (err: any) {
            setBookingStatus('available'); // Let them try again
            setBookingMessage(err.response?.data?.error || 'Failed to process payment.');
            setShowPaymentModal(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-details-loading">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p>Loading premium workspace...</p>
            </div>
        );
    }

    if (error || !branch) {
        return (
            <div className="space-details-loading">
                <p className="error-text">{error || 'Workspace not found.'}</p>
                <button className="btn-primary mt-4" onClick={() => navigate('/')}>Return Home</button>
            </div>
        );
    }

    const heroImage = id === '1'
        ? 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200'
        : id === '2'
            ? 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&q=80&w=1200'
            : 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=1200';

    return (
        <div className="space-details-page">
            <div className="details-hero" style={{ backgroundImage: `url(${heroImage})` }}>
                <div className="details-hero-overlay"></div>
                <div className="container details-hero-content">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="details-title-group">
                        <span className="details-badge">Verified Space</span>
                        <h1 className="details-title">{branch.name}</h1>
                        <div className="details-meta">
                            <span className="details-rating"><Star size={18} fill="var(--color-primary)" /> 4.9 (128 reviews)</span>
                            <span className="details-location"><MapPin size={18} /> {branch.description.replace('Branch located in ', '')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container details-grid">
                <div className="details-main">
                    <section className="details-section">
                        <h2>About this Space</h2>
                        <p className="details-description">{branch.description}. Enjoy a premium, inspiring environment tailored to foster creativity and productivity. Whether you need a quiet corner for deep work or a collaborative room for your team, this branch offers everything you need to thrive.</p>
                    </section>

                    <section className="details-section">
                        <h2>Amenities & Facilities</h2>
                        <div className="amenities-grid">
                            {branch.facilities && branch.facilities.length > 0 ? branch.facilities.map((fac, idx) => (
                                <div key={idx} className="amenity-item">
                                    <div className="amenity-icon">
                                        {mapIcon(fac.name)}
                                    </div>
                                    <div className="amenity-info">
                                        <h4>{fac.name}</h4>
                                        <p>{fac.description}</p>
                                    </div>
                                </div>
                            )) : (
                                <p>Standard amenities included.</p>
                            )}
                        </div>
                    </section>
                </div>

                <div className="details-sidebar">
                    <div className="booking-card glass-panel">
                        <h3>Available Options</h3>
                        <p className="booking-subtitle">Select a space type to book</p>

                        <div className="services-list">
                            {branch.services && branch.services.length > 0 ? branch.services.map((service, idx) => (
                                <div
                                    key={idx}
                                    className={`service-option ${selectedService?.vendorServiceId === service.vendorServiceId ? 'active' : ''}`}
                                    onClick={() => {
                                        if (selectedService?.vendorServiceId !== service.vendorServiceId) {
                                            setSelectedService(service);
                                            setBookingStatus('idle');
                                            setBookingMessage('');
                                        }
                                    }}
                                >
                                    <div className="service-option-header">
                                        <h4>{service.name}</h4>
                                        <div className="service-option-price">
                                            <span className="price-val">JOD {service.pricePerHour}</span><span>/hr</span>
                                        </div>
                                    </div>
                                    <div className="service-option-meta">
                                        <span className="service-capacity"><Users size={14} /> {service.capacity || '1-4'} People</span>
                                    </div>

                                    {selectedService?.vendorServiceId === service.vendorServiceId && (
                                        <div className="booking-form-area" onClick={(e) => e.stopPropagation()}>
                                            <div className="form-group">
                                                <label><CalendarDays size={14} /> Date</label>
                                                <input type="date" className="booking-input" value={date} onChange={(e) => { setDate(e.target.value); setBookingStatus('idle'); }} />
                                            </div>
                                            <div className="time-group">
                                                <div className="form-group">
                                                    <label><Clock size={14} /> Start</label>
                                                    <input type="time" className="booking-input" value={startTime} onChange={(e) => { setStartTime(e.target.value); setBookingStatus('idle'); }} />
                                                </div>
                                                <div className="form-group">
                                                    <label><Clock size={14} /> End</label>
                                                    <input type="time" className="booking-input" value={endTime} onChange={(e) => { setEndTime(e.target.value); setBookingStatus('idle'); }} />
                                                </div>
                                            </div>

                                            {bookingMessage && (
                                                <div className={`booking-message ${bookingStatus}`}>
                                                    {bookingStatus === 'success' || bookingStatus === 'available' ? <Check size={16} /> : null}
                                                    {bookingMessage}
                                                </div>
                                            )}

                                            {bookingStatus === 'idle' || bookingStatus === 'unavailable' ? (
                                                <button
                                                    className="btn-outline full-width mt-4"
                                                    onClick={handleCheckAvailability}
                                                    disabled={!date || !startTime || !endTime}
                                                >
                                                    Check Availability
                                                </button>
                                            ) : bookingStatus === 'checking' || bookingStatus === 'booking' ? (
                                                <button className="btn-primary full-width mt-4" disabled>
                                                    <Loader2 className="animate-spin" size={20} /> Processing
                                                </button>
                                            ) : (
                                                <button className="btn-primary full-width mt-4" onClick={handleOpenPaymentModal}>
                                                    Confirm & Pay
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p>No specific room types listed. Contact support for booking.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content payment-modal">
                        <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                            <X size={20} />
                        </button>
                        <h2>Complete Payment</h2>

                        <div className="payment-summary">
                            <div className="summary-row">
                                <span className="label">Workspace</span>
                                <span className="value text-white">{selectedService?.name}</span>
                            </div>
                            <div className="summary-row">
                                <span className="label">Date</span>
                                <span className="value text-white">{date || 'Not selected'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="label">Time</span>
                                <span className="value text-white">{startTime || 'Not selected'} - {endTime || 'Not selected'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="label">Duration</span>
                                <span className="value text-white">
                                    {startTime && endTime ? `${Math.abs(new Date(`${date}T${endTime}`).getTime() - new Date(`${date}T${startTime}`).getTime()) / 36e5} hour(s)` : '0 hour(s)'}
                                </span>
                            </div>
                            <div className="summary-row total-row">
                                <span className="label">Total</span>
                                <span className="value total text-primary">JOD {totalPrice}</span>
                            </div>
                        </div>

                        <div className="payment-methods">
                            <p className="method-label">Select payment method</p>
                            <div className="method-toggle">
                                <button className={`method-btn ${paymentMethod === 'apple_pay' ? 'active' : ''}`} onClick={() => setPaymentMethod('apple_pay')}>
                                    <AppleIcon /> Pay
                                </button>
                                <button className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>
                                    <CreditCard size={18} /> Card
                                </button>
                            </div>
                        </div>

                        {paymentMethod === 'card' && (
                            <div className="card-details">
                                <div className="form-group mb-3" style={{ position: 'relative' }}>
                                    <label>Card Number</label>
                                    <input
                                        type="text"
                                        className="booking-input"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardNumber}
                                        onChange={handleCardNumberChange}
                                        style={{ paddingRight: '50px' }}
                                    />
                                    {getCardType() === 'visa' && <VisaLogo />}
                                    {getCardType() === 'mastercard' && <MastercardLogo />}
                                </div>
                                <div className="time-group mt-3" style={{ marginTop: '16px' }}>
                                    <div className="form-group">
                                        <label>Expiry</label>
                                        <input
                                            type="text"
                                            className="booking-input"
                                            placeholder="MM/YY"
                                            value={cardExpiry}
                                            onChange={handleExpiryChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>CVV</label>
                                        <input
                                            type="text"
                                            className="booking-input"
                                            placeholder="123"
                                            value={cardCvv}
                                            onChange={handleCvvChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button className="btn-primary full-width payment-submit-btn" onClick={handleProcessPayment} disabled={bookingStatus === 'booking'}>
                            {bookingStatus === 'booking' ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Pay JOD {totalPrice}</>}
                        </button>
                        <p className="secure-text">Your payment is secure and encrypted.</p>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmationModal && (
                <div className="modal-overlay">
                    <div className="modal-content confirmation-modal">
                        <div className="success-icon-large text-success">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Booking Confirmed!</h2>
                        <p className="confirmation-subtext">Your workspace has been reserved. Here are your booking details.</p>

                        <div className="confirmation-details">
                            <div className="conf-item">
                                <div className="conf-icon"><Coffee size={18} /></div>
                                <div className="conf-text">
                                    <span className="label">Workspace</span>
                                    <span className="value">{selectedService?.name}</span>
                                </div>
                            </div>
                            <div className="conf-item">
                                <div className="conf-icon"><CalendarDays size={18} /></div>
                                <div className="conf-text">
                                    <span className="label">Date & Time</span>
                                    <span className="value">{date} at {startTime}</span>
                                </div>
                            </div>
                            <div className="conf-item">
                                <div className="conf-icon"><Clock size={18} /></div>
                                <div className="conf-text">
                                    <span className="label">Duration</span>
                                    <span className="value">
                                        {startTime && endTime ? `${Math.abs(new Date(`${date}T${endTime}`).getTime() - new Date(`${date}T${startTime}`).getTime()) / 36e5} hour(s)` : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="conf-item">
                                <div className="conf-icon"><CreditCard size={18} /></div>
                                <div className="conf-text">
                                    <span className="label">Total Paid ({paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Visa/MasterCard'})</span>
                                    <span className="value text-primary">JOD {totalPrice}</span>
                                </div>
                            </div>
                        </div>

                        <div className="confirmation-actions">
                            <button className="btn-primary full-width" onClick={() => navigate('/dashboard')}>
                                <CalendarIcon size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpaceDetails;
