import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Shield,
    Lock,
    Save,
    Camera,
    Loader2,
    CheckCircle
} from 'lucide-react';
import api from '../services/api';
import './Profile.css';

interface VendorProfile {
    id: number;
    email: string | null;
    phoneNumber: string | null;
    role: string;
    branches: { id: number; name: string; location: string }[];
}

type ProfileTab = 'personal' | 'branch' | 'security';

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<VendorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

    // Avatar
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem('vendor_avatar'));

    // Editable fields
    const [phone, setPhone] = useState('');
    const [branchName, setBranchName] = useState('');
    const [branchLocation, setBranchLocation] = useState('');

    // Password fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwError, setPwError] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSaved, setPwSaved] = useState(false);

    // Toast
    const [toast, setToast] = useState<string | null>(null);
    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/vendor/profile');
                setProfile(res.data);
                setPhone(res.data.phoneNumber || '');
                if (res.data.branches?.length > 0) {
                    setBranchName(res.data.branches[0].name || '');
                    setBranchLocation(res.data.branches[0].location || '');
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/vendor/profile', {
                phoneNumber: phone,
                branchName,
                branchLocation,
            });
            setSaved(true);
            showToast('Profile saved successfully!');
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save profile', err);
            showToast('Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        setPwError('');
        if (!newPassword || newPassword.length < 6) {
            setPwError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError('Passwords do not match.');
            return;
        }
        try {
            setPwSaving(true);
            await api.patch('/vendor/profile/password', { newPassword });
            setNewPassword('');
            setConfirmPassword('');
            setPwSaved(true);
            showToast('Password updated!');
            setTimeout(() => setPwSaved(false), 3000);
        } catch (err) {
            setPwError('Failed to update password. Please try again.');
        } finally {
            setPwSaving(false);
        }
    };

    // Avatar upload
    const handleAvatarClick = () => fileInputRef.current?.click();
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setAvatarUrl(dataUrl);
            localStorage.setItem('vendor_avatar', dataUrl);
            showToast('Avatar updated!');
        };
        reader.readAsDataURL(file);
    };

    // Generate initials from email
    const getInitials = () => {
        if (!profile?.email) return 'V';
        const parts = profile.email.split('@')[0].split(/[._-]/);
        return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
    };

    // Refs for scrolling to sections
    const personalRef = useRef<HTMLDivElement>(null);
    const branchRef = useRef<HTMLDivElement>(null);
    const securityRef = useRef<HTMLDivElement>(null);

    const handleTabClick = (tab: ProfileTab) => {
        setActiveTab(tab);
        const refMap = { personal: personalRef, branch: branchRef, security: securityRef };
        refMap[tab].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="dashboard-loading">
                    <Loader2 className="spinner" size={32} />
                    <p>Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            {/* Toast */}
            {toast && <div className="toast-notification">{toast}</div>}

            <header className="page-header glass">
                <div className="header-left">
                    <h1>Vendor Profile</h1>
                    <p>Manage your account settings and branch information.</p>
                </div>
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 size={18} className="spinning" /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </header>

            <div className="profile-grid">
                <div className="profile-sidebar">
                    <div className="avatar-section glass">
                        <div className="avatar-wrapper">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="avatar-img" />
                            ) : (
                                <div className="avatar-placeholder">{getInitials()}</div>
                            )}
                            <button className="change-avatar" onClick={handleAvatarClick}>
                                <Camera size={16} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <h3>{profile?.email?.split('@')[0] || 'Vendor'}</h3>
                        <p>{profile?.role === 'VENDOR' ? 'Principal Vendor' : profile?.role}</p>
                        <span className="badge-verified">Verified Partner</span>
                    </div>

                    <nav className="profile-nav glass">
                        <button
                            className={`nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => handleTabClick('personal')}
                        >Personal Details</button>
                        <button
                            className={`nav-item ${activeTab === 'branch' ? 'active' : ''}`}
                            onClick={() => handleTabClick('branch')}
                        >Branch Identity</button>
                        <button
                            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => handleTabClick('security')}
                        >Security</button>
                    </nav>
                </div>

                <div className="profile-main">
                    {/* Personal Info */}
                    <section ref={personalRef} className="profile-section glass">
                        <div className="section-header">
                            <User size={20} color="#FF5B04" />
                            <h3>Personal Information</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={16} />
                                    <input type="email" value={profile?.email || ''} disabled />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <div className="input-wrapper">
                                    <Phone size={16} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+966 5X XXX XXXX"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <div className="input-wrapper">
                                    <Shield size={16} />
                                    <input type="text" value={profile?.role || 'VENDOR'} disabled />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Branch Info */}
                    <section ref={branchRef} className="profile-section glass">
                        <div className="section-header">
                            <Building2 size={20} color="#FF5B04" />
                            <h3>Branch Information</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Branch Name</label>
                                <div className="input-wrapper">
                                    <Building2 size={16} />
                                    <input
                                        type="text"
                                        value={branchName}
                                        onChange={e => setBranchName(e.target.value)}
                                        placeholder="e.g. AtSpaces Central"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <div className="input-wrapper">
                                    <MapPin size={16} />
                                    <input
                                        type="text"
                                        value={branchLocation}
                                        onChange={e => setBranchLocation(e.target.value)}
                                        placeholder="e.g. Amman, Jordan"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section ref={securityRef} className="profile-section glass">
                        <div className="section-header">
                            <Lock size={20} color="#FF5B04" />
                            <h3>Change Password</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>New Password</label>
                                <div className="input-wrapper">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <div className="input-wrapper">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat new password"
                                    />
                                </div>
                            </div>
                        </div>
                        {pwError && <p className="auth-error" style={{ marginTop: '0.5rem' }}>{pwError}</p>}
                        <button
                            className="save-btn"
                            style={{ marginTop: '1rem' }}
                            onClick={handlePasswordChange}
                            disabled={pwSaving}
                        >
                            {pwSaving ? <Loader2 size={18} className="spinning" /> : pwSaved ? <CheckCircle size={18} /> : <Lock size={18} />}
                            {pwSaved ? 'Password Updated!' : 'Update Password'}
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Profile;
