import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-semibold">{import.meta.env.VITE_APP_NAME || 'Website Monitor'}</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 mr-4">
                                {user?.email}
                            </span>
                            <button
                                onClick={() => logout()}
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white shadow-sm mt-auto">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        {import.meta.env.VITE_APP_NAME || 'Website Monitor'} &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default DashboardLayout;
