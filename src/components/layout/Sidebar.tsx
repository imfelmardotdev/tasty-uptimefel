import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    LayoutDashboard, // Monitoring
    ShieldAlert,    // Incidents
    BarChart3,      // Status pages (using bar chart as placeholder)
    Wrench,         // Maintenance
    Users,          // Team members
    Share2,         // Integrations & API (using share as placeholder)
    LogOut,         // Logout
    LifeBuoy,       // Placeholder for Upgrade icon
    ChevronDown,    // Placeholder for dropdowns
    Check           // Placeholder for checkmark
} from 'lucide-react';

// Define the structure for navigation items
interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                    ? 'bg-gray-200 text-gray-900' // Active state style for light theme
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' // Default state style
            }`
        }
    >
        <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
        {label}
    </NavLink>
);

const Sidebar = () => {
    const { user, logout } = useAuth();

    // Placeholder user data - replace with actual data from context
    // const userName = user?.email?.split('@')[0] || 'User'; // No longer needed
    // Derive initials from email if available, otherwise use 'U'
    const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U';
    const teamName = "Your Team"; // Placeholder

    return (
        <div className="flex flex-col h-full">
            {/* Logo/App Name */}
            <div className="px-4 py-5 flex items-center space-x-2 border-b border-gray-200">
                <span className="h-3 w-3 bg-green-500 rounded-full"></span>
                <span className="text-lg font-semibold text-gray-900">{import.meta.env.VITE_APP_NAME || 'Uptime Monitor'}</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Monitoring" />
                {/* <NavItem to="/incidents" icon={ShieldAlert} label="Incidents" /> */}
                <NavItem to="/status" icon={BarChart3} label="Status pages" />
                {/* <NavItem to="/maintenance" icon={Wrench} label="Maintenance" /> */}
                {/* <NavItem to="/team" icon={Users} label="Team members" /> */}
                {/* <NavItem to="/integrations" icon={Share2} label="Integrations & API" /> */}
            </nav>

            {/* User/Team Section */}
            <div className="px-4 py-4 border-t border-gray-200">
                {/* User Info */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                            {/* <AvatarImage src={user?.avatarUrl} /> */}
                            <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0"> {/* Added min-w-0 for truncation */}
                            {/* Display email directly, add truncation */}
                            <p className="text-sm font-medium text-gray-900 truncate" title={user?.email || ''}>
                                {user?.email || 'Loading...'}
                            </p>
                        </div>
                    </div>
                    {/* Add dropdown/logout here if needed, or keep logout separate */}
                     <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                        <LogOut className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </Button>
                </div>

                {/* Teams - Commented out as requested */}
                {/* <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your teams</p>
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        <div className="flex items-center space-x-2">
                            <Avatar className="h-5 w-5 text-xs">
                                <AvatarFallback className="bg-gray-300 text-gray-700">{teamName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{teamName}</span>
                        </div>
                        <Check className="h-4 w-4 text-green-600" />
                    </button>
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-100">
                        <div className="flex items-center space-x-2">
                            <Avatar className="h-5 w-5 text-xs">
                                <AvatarFallback className="bg-gray-300 text-gray-700">K</AvatarFallback> 
                            </Avatar>
                            <span>Kai</span> 
                        </div>
                    </button>
                </div> */}
            </div>

            {/* Upgrade Button - Commented out as requested */}
            {/* <div className="px-4 py-4 border-t border-gray-200">
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <LifeBuoy className="mr-2 h-4 w-4" /> 
                    Upgrade now
                </Button>
            </div> */}
        </div>
    );
};

export default Sidebar;
