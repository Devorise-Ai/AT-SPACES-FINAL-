import React, { useState } from 'react';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LayoutGrid
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login({ email, password });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
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
                    <h2>Manage your workspace <span>with clarity.</span></h2>
                    <p>Your operations dashboard for real-time capacity control, booking oversight, and branch performance.</p>
                </div>

                <div className="hero-stats">
                    <div className="mini-stat">
                        <strong>50+</strong>
                        <span>Active Branches</span>
                    </div>
                    <div className="mini-stat">
                        <strong>1.2K</strong>
                        <span>Bookings Today</span>
                    </div>
                    <div className="mini-stat">
                        <strong>78%</strong>
                        <span>Avg Occupancy</span>
                    </div>
                </div>
            </div>

            <div className="auth-side-form">
                <div className="form-wrapper">
                    <div className="form-header">
                        <h2>Welcome back</h2>
                        <p>Sign in to your vendor account to continue.</p>
                    </div>

                    {error && <div className="auth-error glass">{error}</div>}

                    <form onSubmit={handleSubmit}>
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

                        <div className="form-group">
                            <div className="label-row">
                                <label>Password</label>
                                <a href="#" className="forgot-link">Forgot password?</a>
                            </div>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
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

                        <div className="remember-me">
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember">Remember me for 30 days</label>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="auth-footer">
                        New vendor? <Link to="/signup">Apply to join AtSpaces</Link>
                    </p>

                    <div className="demo-credentials">
                        <span>Demo credentials: any email + password <code>vendor123</code></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
