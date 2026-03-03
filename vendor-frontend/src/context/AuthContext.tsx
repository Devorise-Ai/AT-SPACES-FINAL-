import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/auth.service';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    branchName?: string;
}

interface AuthContextType {
    user: User | null;
    login: (credentials: { email?: string; phoneNumber?: string; password?: string }) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('vendor_user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const login = async (credentials: { email?: string; phoneNumber?: string; password?: string }) => {
        try {
            const data = await authService.login(credentials);
            localStorage.setItem('vendor_token', data.token);
            localStorage.setItem('vendor_user', JSON.stringify(data.user));
            setUser(data.user as any);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
