import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar glass-panel">
            <div className="navbar-container container">

                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <span className="logo-at">At</span><span className="logo-spaces text-primary">Spaces</span>
                </Link>

                {/* Navigation Links */}
                <div className="navbar-links">
                    <Link to="/" className="nav-link">Explore</Link>
                    <Link to="/workspaces" className="nav-link">Workspaces</Link>
                    <Link to="/pricing" className="nav-link">Pricing</Link>
                    <Link to="/ai-assistant" className="nav-link">AI Assistant</Link>
                </div>

                {/* Right Actions */}
                <div className="navbar-actions">
                    <Link to="/book" className="btn-primary">Book Now</Link>

                    {isAuthenticated ? (
                        <>
                            <span style={{ color: 'var(--color-grey-200)', fontSize: '0.9rem', marginLeft: '8px' }}>
                                {user?.fullName || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <button className="icon-btn" aria-label="Logout" onClick={handleLogout} title="Logout">
                                <LogOut size={20} />
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="icon-btn" aria-label="User Profile" title="Login / Sign Up">
                            <User size={20} />
                        </Link>
                    )}
                </div>

            </div>
        </nav>
    );
};

export default Navbar;
