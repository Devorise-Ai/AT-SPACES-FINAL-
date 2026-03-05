import React, { useEffect, useState } from 'react';
import { ClipboardCheck, ChevronRight, X, CheckCircle, XCircle } from 'lucide-react';
import { getPendingRequests, getRequestDetails, reviewRequest } from '../services/admin.service';
import './Approvals.css';

const Approvals: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getPendingRequests({ status: filter });
            setRequests(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRequests(); }, [filter]);

    const handleViewDetails = async (id: number) => {
        try {
            const data = await getRequestDetails(id);
            setSelected(data);
            setRejectionReason('');
        } catch (e) { console.error(e); }
    };

    const handleDecision = async (decision: string) => {
        if (!selected) return;
        if (decision === 'REJECTED' && !rejectionReason.trim()) {
            alert('Please provide a rejection reason.');
            return;
        }

        setProcessing(true);
        try {
            await reviewRequest(selected.id, decision, decision === 'REJECTED' ? rejectionReason : undefined);
            setSelected(null);
            fetchRequests();
        } catch (e: any) {
            console.error(e);
            const errMsg = e.response?.data?.error || 'Failed to process request.';
            alert(errMsg);
        } finally {
            setProcessing(false);
        }
    };

    const statusBadge = (status: string) => {
        const cls = status === 'APPROVED' ? 'badge-success' : status === 'REJECTED' ? 'badge-danger' : 'badge-warning';
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div className="approvals-page">
            <div className="page-header">
                <div>
                    <h1>Approval Requests</h1>
                    <p className="subtitle">Review and process vendor requests across the network.</p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="status-tabs">
                    {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                        <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => { setFilter(s); setSelected(null); }}>{s}</button>
                    ))}
                </div>
                <span className="request-count">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="approvals-layout">
                <div className="requests-list">
                    {loading ? <p className="muted">Loading...</p> : requests.length === 0 ? <p className="muted">No {filter.toLowerCase()} requests.</p> : (
                        requests.map((r: any) => (
                            <div className={`request-card card ${selected?.id === r.id ? 'selected' : ''}`} key={r.id} onClick={() => handleViewDetails(r.id)}>
                                <div className="request-card-top">
                                    <div className="request-icon"><ClipboardCheck size={18} /></div>
                                    <div className="request-info">
                                        <strong>{r.type?.replace('_', ' ')}</strong>
                                        <small>by {r.vendor?.businessName || r.vendor?.email || 'Unknown'}</small>
                                    </div>
                                    {statusBadge(r.status)}
                                </div>
                                <div className="request-meta">
                                    {r.branch && <span>Branch: <strong>{r.branch.name}</strong></span>}
                                    {r.service && <span>Service: <strong>{r.service.name}</strong></span>}
                                    <ChevronRight size={16} className="chevron" />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {selected && (
                    <div className="request-detail card">
                        <div className="detail-header">
                            <h3>{selected.type?.replace('_', ' ')}</h3>
                            <button className="close-btn" onClick={() => setSelected(null)}><X size={18} /></button>
                        </div>
                        {statusBadge(selected.status)}

                        <div className="detail-fields">
                            <div><span>Vendor</span> <strong>{selected.vendor?.businessName || selected.vendor?.email || 'N/A'}</strong></div>
                            {selected.branch && <div><span>Branch</span> <strong>{selected.branch.name}</strong></div>}
                            {selected.service && <div><span>Service</span> <strong>{selected.service.name}</strong></div>}
                            {selected.reviewedBy && <div><span>Reviewed by</span> <strong>{selected.reviewedBy.email}</strong></div>}
                            {selected.rejectionReason && <div><span>Reason</span> <strong>{selected.rejectionReason}</strong></div>}
                        </div>

                        {selected.parsedPayload && (
                            <div className="payload-box">
                                <h4>Request Payload</h4>
                                <pre>{JSON.stringify(selected.parsedPayload, null, 2)}</pre>
                            </div>
                        )}

                        {selected.status === 'PENDING' && (
                            <div className="decision-area">
                                <textarea
                                    placeholder="Rejection reason (required if rejecting)..."
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    rows={2}
                                />
                                <div className="decision-actions">
                                    <button className="btn-primary approve-btn" onClick={() => handleDecision('APPROVED')} disabled={processing}>
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button className="btn-secondary reject-btn" onClick={() => handleDecision('REJECTED')} disabled={processing}>
                                        <XCircle size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Approvals;
