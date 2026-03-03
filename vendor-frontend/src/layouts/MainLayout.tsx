import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    return (
        <div className="main-layout">
            <Sidebar />
            <main className="content-area">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
