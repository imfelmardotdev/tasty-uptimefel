import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card'; // Removed CardHeader, CardTitle
import { useAuth } from '../../contexts/AuthContext';
// login import from authService is not used directly here, context handles it

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { login: authContextLogin } = useAuth(); // Rename to avoid conflict
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await authContextLogin(email, password); // Use the login function from context
            navigate('/dashboard'); // Redirect to dashboard on successful login
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error('Login error:', err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
             {/* Logo/App Name */}
            <div className="mb-8 text-center text-2xl font-semibold text-gray-900 flex items-center space-x-2 justify-center">
                <span className="h-3 w-3 bg-green-500 rounded-full"></span>
                <span>{import.meta.env.VITE_APP_NAME || 'Uptime Monitor'}</span>
            </div>

            <Card className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                {/* Removed CardHeader */}
                <CardContent className="p-0"> {/* Remove default CardContent padding */}
                     <h2 className="text-2xl font-bold text-center text-green-600 mb-6">Welcome back!</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Your E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500" // Ensure light theme input style
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500" // Ensure light theme input style
                            />
                        </div>
                        {/* Remember me, Forgot password, Create account sections omitted as requested */}
                        <Button
                            type="submit"
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full text-lg mt-6" // Updated button style
                        >
                            Log in
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {/* Create account link omitted */}
        </div>
    );
};

export default LoginPage;
