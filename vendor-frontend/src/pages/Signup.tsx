import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    LayoutGrid,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Signup: React.FC = () => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();

    // Step 1: Personal Info
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');

    // Step 2: Branch Info
    const [businessName, setBusinessName] = useState('');
    const [branchAddress, setBranchAddress] = useState('');
    const [city, setCity] = useState('Amman');

    // Step 3: Space Details
    const [ownerName, setOwnerName] = useState('');
    const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
    const [spaceType, setSpaceType] = useState('coworking');
    const [totalCapacity, setTotalCapacity] = useState('');
    const [description, setDescription] = useState('');

    // Step 4: Uploads
    const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
    const [spacePhotos, setSpacePhotos] = useState<File[]>([]);
    const [agreeTerms, setAgreeTerms] = useState(false);

    const handleNext = () => {
        setError(null);
        // Basic validation before advancing
        if (step === 1) {
            if (!fullName.trim() || !email.trim() || !password) {
                setError('Please fill in your name, email, and password.');
                return;
            }
            if (password.length < 8) {
                setError('Password must be at least 8 characters.');
                return;
            }
        }
        if (step === 2) {
            if (!businessName.trim() || !branchAddress.trim()) {
                setError('Please fill in business name and branch address.');
                return;
            }
        }
        if (step === 3) {
            if (!ownerName.trim() || !tradeLicenseNumber.trim()) {
                setError('Please fill in owner name and trade license number.');
                return;
            }
        }
        setStep(s => s + 1);
    };

    const handleBack = () => {
        setError(null);
        setStep(s => s - 1);
    };

    const handleSubmit = async () => {
        setError(null);

        if (!agreeTerms) {
            setError('You must agree to the terms and conditions.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/auth/register', {
                fullName,
                email,
                phoneNumber: phoneNumber || undefined,
                password,
                role: 'VENDOR',
                businessName,
                branchAddress: `${branchAddress}, ${city}`,
                ownerName,
                tradeLicenseNumber,
                captchaToken: 'mock-captcha-token', // Mock for development
            });

            setSubmitted(true);
        } catch (err: any) {
            const msg = err.response?.data?.error
                || err.response?.data?.errors?.[0]?.msg
                || 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const steps = [
        { num: 1, label: 'Personal Info' },
        { num: 2, label: 'Branch Info' },
        { num: 3, label: 'Space Details' },
        { num: 4, label: 'Uploads' },
    ];

    if (submitted) {
        return (
            <div className="signup-page">
                <header className="auth-header">
                    <Link to="/" className="brand-header">
                        <div className="brand-logo-small">
                            <LayoutGrid size={24} color="#FF5B04" />
                        </div>
                        <h1>AtSpaces <span>VENDOR</span></h1>
                    </Link>
                </header>

                <main className="signup-content">
                    <div className="stepper-wrapper glass" style={{ textAlign: 'center', maxWidth: 600 }}>
                        <CheckCircle size={64} color="#22c55e" style={{ marginBottom: 24 }} />
                        <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Application Submitted!</h2>
                        <p style={{ color: 'var(--grey-300)', marginBottom: 32, fontSize: '1.1rem' }}>
                            Your vendor application has been sent to the AtSpaces admin team for review.
                            You'll receive an email at <strong>{email}</strong> once your application is approved.
                        </p>
                        <button onClick={() => navigate('/login')} className="btn-continue" style={{ margin: '0 auto' }}>
                            Go to Login
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="signup-page">
            <header className="auth-header">
                <Link to="/" className="brand-header">
                    <div className="brand-logo-small">
                        <LayoutGrid size={24} color="#FF5B04" />
                    </div>
                    <h1>AtSpaces <span>VENDOR</span></h1>
                </Link>
            </header>

            <main className="signup-content">
                <div className="signup-hero">
                    <div className="partner-badge">Partner with us</div>
                    <h2>Grow your workspace revenue</h2>
                    <p>Join the AtSpaces network and reach thousands of professionals looking for flexible desks and private offices.</p>
                </div>

                <div className="stepper-wrapper glass">
                    <div className="stepper">
                        {steps.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className={`step ${step >= s.num ? 'active' : ''}`}>
                                    <div className="step-num">{s.num}</div>
                                    <div className="step-label">{s.label}</div>
                                </div>
                                {i < steps.length - 1 && <div className={`step-line ${step > s.num ? 'active' : ''}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>

                    {error && <div className="auth-error glass">{error}</div>}

                    <div className="step-form-content">
                        {step === 1 && (
                            <div className="form-step">
                                <h3>Personal Info</h3>
                                <p>Please provide accurate details to speed up your approval process.</p>

                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email Address *</label>
                                        <input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+962 7X XXX XXXX"
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Password * (min 8 characters)</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="form-step">
                                <h3>Branch Info</h3>
                                <p>Tell us about your main workspace location.</p>
                                <div className="form-group">
                                    <label>Business / Branch Name *</label>
                                    <input
                                        type="text"
                                        placeholder="The Corner Hub - Downtown"
                                        value={businessName}
                                        onChange={e => setBusinessName(e.target.value)}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Branch Address *</label>
                                        <input
                                            type="text"
                                            placeholder="123 King Abdullah II St."
                                            value={branchAddress}
                                            onChange={e => setBranchAddress(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>City</label>
                                        <select value={city} onChange={e => setCity(e.target.value)}>
                                            <option>Amman</option>
                                            <option>Riyadh</option>
                                            <option>Jeddah</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="form-step">
                                <h3>Space Details</h3>
                                <p>Tell us more about your workspace offering.</p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Owner Name *</label>
                                        <input
                                            type="text"
                                            placeholder="Full legal name"
                                            value={ownerName}
                                            onChange={e => setOwnerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Trade License Number *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. TL-2025-00123"
                                            value={tradeLicenseNumber}
                                            onChange={e => setTradeLicenseNumber(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Space Type</label>
                                        <select value={spaceType} onChange={e => setSpaceType(e.target.value)}>
                                            <option value="coworking">Co-Working Space</option>
                                            <option value="private_office">Private Office</option>
                                            <option value="meeting_room">Meeting Room</option>
                                            <option value="event_space">Event Space</option>
                                            <option value="mixed">Mixed Use</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Total Capacity (seats)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 50"
                                            min="1"
                                            value={totalCapacity}
                                            onChange={e => setTotalCapacity(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        placeholder="Describe your workspace — amenities, unique features, target audience..."
                                        rows={3}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--grey-800)',
                                            border: '1px solid var(--border-color)',
                                            color: 'inherit',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="form-step">
                                <h3>Upload Documents</h3>
                                <p>Attach your trade license and photos of your workspace for verification.</p>

                                <div className="form-group">
                                    <label>Trade License (PDF or Image)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={e => {
                                            if (e.target.files?.[0]) setTradeLicenseFile(e.target.files[0]);
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            background: 'var(--grey-800)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'inherit',
                                            width: '100%'
                                        }}
                                    />
                                    {tradeLicenseFile && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--grey-300)', marginTop: 4, display: 'block' }}>
                                            ✓ {tradeLicenseFile.name}
                                        </span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Space Photos (up to 5)</label>
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        multiple
                                        onChange={e => {
                                            if (e.target.files) {
                                                setSpacePhotos(Array.from(e.target.files).slice(0, 5));
                                            }
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            background: 'var(--grey-800)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'inherit',
                                            width: '100%'
                                        }}
                                    />
                                    {spacePhotos.length > 0 && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--grey-300)', marginTop: 4, display: 'block' }}>
                                            ✓ {spacePhotos.length} photo{spacePhotos.length > 1 ? 's' : ''} selected
                                        </span>
                                    )}
                                </div>

                                <div className="remember-me" style={{ marginTop: 'var(--space-lg)' }}>
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={agreeTerms}
                                        onChange={e => setAgreeTerms(e.target.checked)}
                                    />
                                    <label htmlFor="terms">
                                        I agree to the AtSpaces{' '}
                                        <a href="#" style={{ color: 'var(--primary)' }}>Terms of Service</a>{' '}
                                        and{' '}
                                        <a href="#" style={{ color: 'var(--primary)' }}>Vendor Partnership Agreement</a>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="step-actions">
                            {step > 1 && (
                                <button onClick={handleBack} className="btn-back">
                                    <ChevronLeft size={18} /> Back
                                </button>
                            )}
                            <div style={{ flex: 1 }}></div>
                            {step < 4 ? (
                                <button onClick={handleNext} className="btn-continue">
                                    Continue <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    className="btn-continue"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 size={18} className="spinner" /> : null}
                                    {isLoading ? 'Submitting...' : 'Submit Application'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
