import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'UNDER_REVIEW' | 'SUSPENDED';

interface User {
    id: string;
    email?: string;
    phoneNumber?: string;
    fullName?: string;
    role: UserRole;
    status: UserStatus;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isVendor: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for token on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // Set default header for axios
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token,
            isVendor: user?.role === 'VENDOR',
            isAdmin: user?.role === 'ADMIN'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
