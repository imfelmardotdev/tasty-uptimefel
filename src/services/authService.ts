interface AuthResponse {
    user: {
        id: number;
        email: string;
    };
    token: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }

    return response.json();
};

export const register = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }

    return response.json();
};

export const getToken = (): string | null => {
    return localStorage.getItem('authToken');
};

export const setToken = (token: string): void => {
    localStorage.setItem('authToken', token);
};

export const logout = (): void => {
    localStorage.removeItem('authToken');
    // Optionally: Redirect or notify other parts of the app
};


export const verifyToken = async (token: string): Promise<{ user: { id: number; email: string } }> => {
    const response = await fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Invalid token');
    }

    return response.json();
};
