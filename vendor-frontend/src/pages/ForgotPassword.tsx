import React, { useState } from 'react';
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, LayoutGrid, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const ForgotPassword: React.FC = () => {
    const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        try {
            await api.post('/auth/request-reset', { email });
            setMessage('If that email exists, a reset link has been sent. Check your inbox and enter the reset token below.');
            setStep('reset');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send reset link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/auth/reset-password', { email, token, newPassword });
            setStep('done');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password. The token may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-side-branding">
                <div className="brand-header">
                    <div className="brand-logo-small">
                        <LayoutGrid size={24} color="#FF5B04" />
                    </div>
                    <h1>AtSpaces <span>VENDOR</span></h1>
                </div>

                <div className="hero-content">
                    <h2>Reset your <span>password.</span></h2>
                    <p>Don't worry, we'll help you regain access to your vendor dashboard securely.</p>
                </div>

                <div className="hero-stats">
                    <div className="mini-stat">
                        <strong><KeyRound size={20} /></strong>
                        <span>Secure Reset</span>
                    </div>
                    <div className="mini-stat">
                        <strong><Lock size={20} /></strong>
                        <span>Token Verified</span>
                    </div>
                    <div className="mini-stat">
                        <strong><CheckCircle size={20} /></strong>
                        <span>Instant Access</span>
                    </div>
                </div>
            </div>

            <div className="auth-side-form">
                <div className="form-wrapper">
                    {step === 'request' && (
                        <>
                            <div className="form-header">
                                <h2>Forgot Password</h2>
                                <p>Enter your email address and we'll send you a reset token.</p>
                            </div>

                            {error && <div className="auth-error glass">{error}</div>}
                            {message && <div className="auth-success glass">{message}</div>}

                            <form onSubmit={handleRequestReset}>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-with-icon">
                                        <Mail size={18} className="input-icon" />
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="submit-btn" disabled={isLoading}>
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>

                            <p className="auth-footer">
                                <Link to="/login"><ArrowLeft size={14} style={{ marginRight: 6 }} />Back to Login</Link>
                            </p>
                        </>
                    )}

                    {step === 'reset' && (
                        <>
                            <div className="form-header">
                                <h2>Reset Password</h2>
                                <p>Enter the reset token from your email and choose a new password.</p>
                            </div>

                            {error && <div className="auth-error glass">{error}</div>}
                            {message && <div className="auth-success glass">{message}</div>}

                            <form onSubmit={handleResetPassword}>
                                <div className="form-group">
                                    <label>Reset Token</label>
                                    <div className="input-with-icon">
                                        <KeyRound size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            placeholder="Paste the token from your email"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Min 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            className="eye-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Re-enter your new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="submit-btn" disabled={isLoading}>
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>

                            <p className="auth-footer">
                                <Link to="/login"><ArrowLeft size={14} style={{ marginRight: 6 }} />Back to Login</Link>
                            </p>
                        </>
                    )}

                    {step === 'done' && (
                        <div className="reset-success">
                            <div className="form-header">
                                <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 16 }} />
                                <h2>Password Reset!</h2>
                                <p>Your password has been successfully reset. You can now log in with your new password.</p>
                            </div>
                            <Link to="/login" className="submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                                Go to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
