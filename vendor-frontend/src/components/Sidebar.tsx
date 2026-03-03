import React from 'react';
import {
    LayoutDashboard,
    Settings2,
    CalendarCheck,
    BarChart3,
    UserCircle,
    Bell,
    Sun,
    LogOut,
    LayoutGrid
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <Settings2 size={20} />, label: 'Capacity', path: '/capacity' },
        { icon: <CalendarCheck size={20} />, label: 'Bookings', path: '/bookings' },
        { icon: <BarChart3 size={20} />, label: 'Reports', path: '/reports' },
        { icon: <UserCircle size={20} />, label: 'Profile', path: '/profile' },
    ];

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <LayoutGrid size={24} color="#FF5B04" />
                </div>
                <div className="brand-text">
                    <h1>AtSpaces</h1>
                    <span>VENDOR HUB</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="footer-item">
                    <span className="nav-icon"><Bell size={20} /></span>
                    <span className="nav-label">Notifications</span>
                    <span className="notification-badge"></span>
                </button>
                <button className="footer-item">
                    <span className="nav-icon"><Sun size={20} /></span>
                    <span className="nav-label">Light Mode</span>
                </button>
                <div className="sidebar-divider"></div>
                <button className="footer-item logout" onClick={handleSignOut}>
                    <span className="nav-icon"><LogOut size={20} /></span>
                    <span className="nav-label">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
