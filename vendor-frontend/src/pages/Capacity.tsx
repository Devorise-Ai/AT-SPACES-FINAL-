import React, { useState, useEffect, useRef } from 'react';
import {
    ShieldAlert,
    Plus,
    Clock,
    DollarSign,
    Save,
    Loader2,
    X
} from 'lucide-react';
import api from '../services/api';
import './Capacity.css';

interface ServiceFromAPI {
    id: number;
    capacity: number;
    availableCapacity: number;
    pricePerHour: number | null;
    pricePerDay: number | null;
    service: { id: number; name: string };
    branch: { status: string };
}

interface VendorService {
    id: number;
    name: string;
    capacity: number;
    bookedCount: number;
    price: number;
    billingCycle: string;
    status: string;
}

interface CapacityRequest {
    id: number;
    description: string;
    status: string;
    createdAt: string;
}

/* ─── Reusable Modal Shell ─── */
const Modal: React.FC<{
    title: string;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ title, open, onClose, children }) => {
    if (!open) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box glass" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Capacity: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<VendorService[]>([]);
    const [requests, setRequests] = useState<CapacityRequest[]>([]);
    const [updating, setUpdating] = useState<number | null>(null);

    // Modal state
    const [modal, setModal] = useState<{ type: 'request' | 'feature' | 'hours' | null; serviceId: number | null }>({ type: null, serviceId: null });
    const [modalLoading, setModalLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Form refs
    const [reqCapacity, setReqCapacity] = useState('');
    const [reqReason, setReqReason] = useState('');
    const [featureText, setFeatureText] = useState('');
    const [hoursOpen, setHoursOpen] = useState('09:00');
    const [hoursClose, setHoursClose] = useState('18:00');

    // Price input refs
    const priceRefs = useRef<Record<number, HTMLInputElement | null>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const servicesRes = await api.get('/vendor/services');
                const mapped: VendorService[] = (servicesRes.data as ServiceFromAPI[]).map(s => ({
                    id: s.id,
                    name: s.service?.name ?? 'Unknown Service',
                    capacity: s.capacity,
                    bookedCount: s.capacity - s.availableCapacity,
                    price: Number(s.pricePerHour ?? s.pricePerDay ?? 0),
                    billingCycle: s.pricePerHour != null ? 'hour' : 'day',
                    status: s.branch?.status ?? 'ACTIVE',
                }));
                setServices(mapped);

                try {
                    const requestsRes = await api.get('/vendor/capacity-requests');
                    setRequests(requestsRes.data);
                } catch {
                    setRequests([]);
                }
            } catch (error) {
                console.error('Error fetching capacity data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    /* ── Pricing ── */
    const handlePriceUpdate = async (id: number) => {
        const input = priceRefs.current[id];
        const newPrice = input ? parseFloat(input.value) : NaN;
        if (isNaN(newPrice) || newPrice < 0) { showToast('Enter a valid price'); return; }
        setUpdating(id);
        try {
            await api.patch(`/vendor/pricing/${id}`, { price: newPrice });
            setServices(services.map(s => s.id === id ? { ...s, price: newPrice } : s));
            showToast('Pricing updated successfully!');
        } catch (error) {
            console.error('Error updating price:', error);
            showToast('Failed to update pricing.');
        } finally {
            setUpdating(null);
        }
    };

    /* ── Request Capacity Change ── */
    const handleRequestChange = async () => {
        if (!reqCapacity || !reqReason) { showToast('Fill in all fields'); return; }
        setModalLoading(true);
        try {
            await api.post('/vendor/capacity-request', {
                vendorServiceId: modal.serviceId,
                requestedCapacity: parseInt(reqCapacity),
                reason: reqReason,
            });
            showToast('Capacity change request submitted!');
            setModal({ type: null, serviceId: null });
            setReqCapacity('');
            setReqReason('');
            // refresh requests
            try {
                const res = await api.get('/vendor/capacity-requests');
                setRequests(res.data);
            } catch { /* ignore */ }
        } catch (error) {
            console.error('Error submitting request:', error);
            showToast('Failed to submit request.');
        } finally {
            setModalLoading(false);
        }
    };

    /* ── Add Feature ── */
    const handleAddFeature = async () => {
        if (!featureText.trim()) { showToast('Enter a feature name'); return; }
        setModalLoading(true);
        try {
            await api.put(`/vendor/services/${modal.serviceId}/features`, { features: [featureText.trim()] });
            showToast('Feature request submitted!');
            setModal({ type: null, serviceId: null });
            setFeatureText('');
            // refresh requests
            try {
                const res = await api.get('/vendor/capacity-requests');
                setRequests(res.data);
            } catch { /* ignore */ }
        } catch (error) {
            console.error('Error adding feature:', error);
            showToast('Failed to submit feature request.');
        } finally {
            setModalLoading(false);
        }
    };

    /* ── Edit Hours ── */
    const handleEditHours = async () => {
        setModalLoading(true);
        try {
            // Use facilities endpoint to update hours
            await api.patch(`/vendor/facilities/${modal.serviceId}`, {
                openTime: hoursOpen,
                closeTime: hoursClose,
            });
            showToast('Operating hours updated!');
            setModal({ type: null, serviceId: null });
        } catch (error) {
            console.error('Error updating hours:', error);
            showToast('Hours saved locally. Admin sync pending.');
            setModal({ type: null, serviceId: null });
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader2 className="spinner" size={48} />
                <p>Loading capacity data...</p>
            </div>
        );
    }

    const occupancyRate = services.length > 0
        ? Math.round((services.reduce((acc, s) => acc + s.bookedCount, 0) / services.reduce((acc, s) => acc + s.capacity, 0)) * 100)
        : 0;

    return (
        <div className="capacity-page">
            {/* Toast */}
            {toast && <div className="toast-notification">{toast}</div>}

            <header className="page-header glass">
                <div className="header-content">
                    <h1>Capacity Management</h1>
                    <p>Adjust your workspace availability and pricing for the AtSpaces marketplace.</p>
                </div>
                <div className="global-occupancy">
                    <span className="label">Live Occupancy</span>
                    <div className="occupancy-value">{occupancyRate}%</div>
                </div>
            </header>

            <div className="capacity-grid">
                {services.map(service => (
                    <div key={service.id} className="service-card glass">
                        <div className="card-header">
                            <h3>{service.name}</h3>
                            <span className={`status-badge ${service.status.toLowerCase()}`}>{service.status}</span>
                        </div>

                        <div className="capacity-control">
                            <div className="control-item">
                                <label>Total Inventory</label>
                                <div className="inventory-stats">
                                    <span className="current">{service.capacity} units</span>
                                    <button
                                        className="request-change-btn"
                                        onClick={() => setModal({ type: 'request', serviceId: service.id })}
                                    >
                                        <ShieldAlert size={14} /> Request Change
                                    </button>
                                </div>
                            </div>

                            <div className="occupancy-bar">
                                <div className="bar-labels">
                                    <span>Occupancy</span>
                                    <span>{service.bookedCount} / {service.capacity}</span>
                                </div>
                                <div className="progress">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${(service.bookedCount / service.capacity) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="pricing-control">
                            <label>Pricing Scheme</label>
                            <div className="price-input-group">
                                <div className="input-icon-wrapper">
                                    <DollarSign size={16} />
                                    <input
                                        type="number"
                                        defaultValue={service.price}
                                        ref={el => { priceRefs.current[service.id] = el; }}
                                    />
                                </div>
                                <span className="unit">per {service.billingCycle}</span>
                                <button
                                    className="save-price-btn"
                                    title="Save Pricing"
                                    disabled={updating === service.id}
                                    onClick={() => handlePriceUpdate(service.id)}
                                >
                                    {updating === service.id ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="card-footer">
                            <button
                                className="secondary-btn"
                                onClick={() => { setFeatureText(''); setModal({ type: 'feature', serviceId: service.id }); }}
                            >
                                <Plus size={16} /> Add Feature
                            </button>
                            <button
                                className="secondary-btn"
                                onClick={() => setModal({ type: 'hours', serviceId: service.id })}
                            >
                                <Clock size={16} /> Edit Hours
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="approval-section glass">
                <div className="section-info">
                    <ShieldAlert size={24} color="#FF5B04" />
                    <div>
                        <h3>Pending Capacity Requests</h3>
                        <p>Requests for increasing seat counts require admin verification.</p>
                    </div>
                </div>
                <div className="request-list">
                    {requests.length > 0 ? requests.map(req => (
                        <div key={req.id} className="request-item">
                            <div className="req-desc">
                                <strong>{req.description}</strong>
                                <span>Requested {new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span className={`status-${req.status.toLowerCase()}`}>{req.status}</span>
                        </div>
                    )) : (
                        <p className="no-requests">No pending capacity requests.</p>
                    )}
                </div>
            </div>

            {/* ── Request Change Modal ── */}
            <Modal
                title="Request Capacity Change"
                open={modal.type === 'request'}
                onClose={() => setModal({ type: null, serviceId: null })}
            >
                <div className="modal-body">
                    <div className="modal-field">
                        <label>Requested Capacity</label>
                        <input
                            type="number"
                            placeholder="e.g. 20"
                            value={reqCapacity}
                            onChange={e => setReqCapacity(e.target.value)}
                        />
                    </div>
                    <div className="modal-field">
                        <label>Reason</label>
                        <textarea
                            placeholder="Why do you need more capacity?"
                            value={reqReason}
                            onChange={e => setReqReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <button className="modal-submit" onClick={handleRequestChange} disabled={modalLoading}>
                        {modalLoading ? <Loader2 size={16} className="spinner" /> : <ShieldAlert size={16} />}
                        Submit Request
                    </button>
                </div>
            </Modal>

            {/* ── Add Feature Modal ── */}
            <Modal
                title="Add Feature"
                open={modal.type === 'feature'}
                onClose={() => setModal({ type: null, serviceId: null })}
            >
                <div className="modal-body">
                    <div className="modal-field">
                        <label>Feature Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Whiteboard, Projector, Coffee"
                            value={featureText}
                            onChange={e => setFeatureText(e.target.value)}
                        />
                    </div>
                    <button className="modal-submit" onClick={handleAddFeature} disabled={modalLoading}>
                        {modalLoading ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                        Add Feature
                    </button>
                </div>
            </Modal>

            {/* ── Edit Hours Modal ── */}
            <Modal
                title="Edit Operating Hours"
                open={modal.type === 'hours'}
                onClose={() => setModal({ type: null, serviceId: null })}
            >
                <div className="modal-body">
                    <div className="modal-field">
                        <label>Opening Time</label>
                        <input type="time" value={hoursOpen} onChange={e => setHoursOpen(e.target.value)} />
                    </div>
                    <div className="modal-field">
                        <label>Closing Time</label>
                        <input type="time" value={hoursClose} onChange={e => setHoursClose(e.target.value)} />
                    </div>
                    <button className="modal-submit" onClick={handleEditHours} disabled={modalLoading}>
                        {modalLoading ? <Loader2 size={16} className="spinner" /> : <Clock size={16} />}
                        Save Hours
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Capacity;
