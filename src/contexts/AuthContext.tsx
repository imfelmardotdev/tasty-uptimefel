import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as authLogin, register as authRegister } from '../services/authService';

interface User {
    id: number;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    // Use 'authToken' key consistent with authService
    const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            // Use 'authToken' key consistent with authService
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                try {
                    // Verify token and get user info
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                    } else {
                        // Invalid token
                        localStorage.removeItem('authToken'); // Use 'authToken' key
                        setUser(null);
                        setToken(null);
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('authToken'); // Use 'authToken' key
                    setUser(null);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { user: userData, token: authToken } = await authLogin(email, password);
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('authToken', authToken); // Use 'authToken' key
    };

    const register = async (email: string, password: string) => {
        const { user: userData, token: authToken } = await authRegister(email, password);
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('authToken', authToken); // Use 'authToken' key
    };

    const navigate = useNavigate();
    
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken'); // Use 'authToken' key
        navigate('/');
    };

    const value = {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
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
