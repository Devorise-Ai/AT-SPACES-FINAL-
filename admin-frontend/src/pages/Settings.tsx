import React, { useEffect, useState } from 'react';
import { User, Lock, Shield } from 'lucide-react';
import { getAdminProfile, updateAdminProfile, updateAdminPassword, getSecurityLogs } from '../services/admin.service';
import './Settings.css';

const Settings: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [profileForm, setProfileForm] = useState({ email: '', phoneNumber: '', ownerName: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [securityLogs, setSecurityLogs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [prof, logs] = await Promise.all([
                    getAdminProfile(),
                    getSecurityLogs(20)
                ]);
                setProfile(prof);
                setProfileForm({
                    email: prof.email || '',
                    phoneNumber: prof.phoneNumber || '',
                    ownerName: prof.ownerName || ''
                });
                setSecurityLogs(logs);
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await updateAdminProfile(profile.id, profileForm);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed.' });
        } finally { setSaving(false); }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await updateAdminPassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Password update failed.' });
        } finally { setSaving(false); }
    };

    const sections = [
        { id: 'profile', icon: <User size={18} />, label: 'Profile' },
        { id: 'password', icon: <Lock size={18} />, label: 'Security' },
        { id: 'logs', icon: <Shield size={18} />, label: 'Activity Logs' },
    ];

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>Settings</h1>
                <p className="subtitle">Manage your admin profile and security preferences.</p>
            </div>

            <div className="settings-layout">
                <div className="settings-nav">
                    {sections.map(s => (
                        <button key={s.id} className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(s.id)}>
                            {s.icon} {s.label}
                        </button>
                    ))}
                </div>

                <div className="settings-content card">
                    {message && (
                        <div className={`settings-message ${message.type}`}>{message.text}</div>
                    )}

                    {activeSection === 'profile' && (
                        <form onSubmit={handleProfileUpdate}>
                            <h3>Profile Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Display Name</label>
                                    <input value={profileForm.ownerName} onChange={e => setProfileForm({ ...profileForm, ownerName: e.target.value })} placeholder="Admin" />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input value={profileForm.phoneNumber} onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} placeholder="+962..." />
                            </div>
                            <button type="submit" className="btn-primary save-btn" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    )}

                    {activeSection === 'password' && (
                        <form onSubmit={handlePasswordUpdate}>
                            <h3>Change Password</h3>
                            <div className="form-group">
                                <label>Current Password</label>
                                <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={8} />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary save-btn" disabled={saving}>
                                {saving ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}

                    {activeSection === 'logs' && (
                        <div>
                            <h3>Security Activity Logs</h3>
                            <div className="logs-list">
                                {securityLogs.length === 0 ? (
                                    <p className="muted">No security events recorded.</p>
                                ) : (
                                    securityLogs.map((log: any, i: number) => (
                                        <div className="log-entry" key={i}>
                                            <div className="log-icon"><Shield size={14} /></div>
                                            <div className="log-info">
                                                <strong>{log.action || log.eventType || 'Event'}</strong>
                                                <small>{log.details || log.description || ''}</small>
                                            </div>
                                            <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
