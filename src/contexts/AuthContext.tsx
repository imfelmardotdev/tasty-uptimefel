import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

// Create the context with a default value (null!) which will be overridden by the provider
// Using null! asserts that the context will always be provided before use.
export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage to persist login across page refreshes
  const [token, setToken] = useState<string | null>(() => {
    // Check if running in a browser environment before accessing localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

  const login = (newToken: string) => {
    if (typeof window !== 'undefined') {
      setToken(newToken);
      localStorage.setItem('authToken', newToken);
      console.log("Token set in localStorage:", newToken); // Debug log
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      setToken(null);
      localStorage.removeItem('authToken');
      console.log("Token removed from localStorage"); // Debug log
      // Optionally redirect to login page here or handle in components
      // window.location.href = '/login'; // Example hard redirect
    }
  };

  // The value provided to the context consumers
  const value = {
    isAuthenticated: !!token, // True if token is not null or empty
    token,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    // This error should ideally not happen if AuthProvider wraps the app correctly
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
