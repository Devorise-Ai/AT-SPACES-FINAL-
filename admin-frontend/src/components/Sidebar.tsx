import React, { useState } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    Building2,
    Users,
    DollarSign,
    ClipboardCheck,
    FileText,
    Settings,
    Bell,
    Sun,
    LogOut,
    ChevronLeft,
    LayoutGrid
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const mainMenu = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <TrendingUp size={20} />, label: 'Analytics', path: '/analytics' },
        { icon: <Building2 size={20} />, label: 'Branches', path: '/branches' },
        { icon: <Users size={20} />, label: 'Vendors', path: '/vendors' },
        { icon: <DollarSign size={20} />, label: 'Pricing', path: '/pricing' },
    ];

    const secondaryMenu = [
        { icon: <ClipboardCheck size={20} />, label: 'Approvals', path: '/approvals' },
        { icon: <FileText size={20} />, label: 'Applications', path: '/applications' },
        { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
    ];

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <LayoutGrid size={22} />
                </div>
                {!collapsed && (
                    <div className="brand-text">
                        <h1>AtSpaces</h1>
                        <span>ADMIN</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {mainMenu.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}

                <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                    <ChevronLeft size={18} className={collapsed ? 'rotated' : ''} />
                </button>

                {secondaryMenu.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="footer-item" title={collapsed ? 'Notifications' : ''}>
                    <span className="nav-icon"><Bell size={20} /></span>
                    {!collapsed && <span className="nav-label">Notifications</span>}
                </button>
                <button className="footer-item" title={collapsed ? 'Light Mode' : ''}>
                    <span className="nav-icon"><Sun size={20} /></span>
                    {!collapsed && <span className="nav-label">Light Mode</span>}
                </button>
                <div className="sidebar-divider" />
                <button className="footer-item logout" onClick={handleSignOut} title={collapsed ? 'Sign Out' : ''}>
                    <span className="nav-icon"><LogOut size={20} /></span>
                    {!collapsed && <span className="nav-label">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
