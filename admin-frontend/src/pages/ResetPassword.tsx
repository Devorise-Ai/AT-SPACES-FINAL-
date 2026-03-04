import React, { useState } from 'react';
import { LayoutGrid, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ResetPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSent(true);
    };

    return (
        <div className="reset-container">
            <div className="reset-card">
                <div className="reset-brand">
                    <div className="brand-logo-small">
                        <LayoutGrid size={22} color="white" />
                    </div>
                    <div>
                        <h1>AtSpaces</h1>
                        <span>ADMIN</span>
                    </div>
                </div>

                {sent ? (
                    <>
                        <h2>Check your email</h2>
                        <p className="subtitle">We've sent a reset link to {email}</p>
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={16} /> Back to Sign In
                        </Link>
                    </>
                ) : (
                    <>
                        <h2>Reset Password</h2>
                        <p className="subtitle">Enter your email and we'll send you a reset link.</p>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="admin@atspaces.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn">
                                Send Reset Link
                            </button>
                        </form>

                        <Link to="/login" className="back-link">
                            <ArrowLeft size={16} /> Back to Sign In
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
