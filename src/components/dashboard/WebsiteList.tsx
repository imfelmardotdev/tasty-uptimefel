import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Trash2, RotateCw, PauseCircle, PlayCircle } from 'lucide-react'; // Added icons
import dayjs from 'dayjs';
import HeartbeatBar from './HeartbeatBar';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Keep interface definition
interface Website {
    id: number;
    name: string;
    url: string;
    last_check_time?: string;
    is_up?: boolean;
    last_status_code?: number;
    last_response_time?: number;
    last_error?: string;
    heartbeats?: any[];
    monitorType?: 'http' | 'https' | 'keyword';
    // Add placeholder for check interval if not available in model
    check_interval_minutes?: number; // Example: 5
    // Add placeholder for uptime percentage if not available
    uptime_percentage?: number; // Example: 100
}

interface WebsiteListProps {
    websites: Website[];
    onDelete: (id: number) => void;
    onCheck: (id: number) => void;
    // Add handlers for Pause/Start if needed
    // onPause: (id: number) => void;
    // onStart: (id: number) => void;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ websites, onDelete, onCheck }) => {
    const navigate = useNavigate(); // Initialize navigate hook

    const getStatusColor = (website: Website) => {
        if (website.is_up === undefined) return 'bg-gray-400'; // Use gray for unknown/unchecked
        return website.is_up ? 'bg-green-500' : 'bg-red-500';
    };

    const getStatusText = (website: Website) => {
        if (website.is_up === undefined) return 'Unknown';
        return website.is_up ? 'Up' : 'Down';
    };

    // Placeholder for uptime calculation or retrieval
    const getUptimeDisplay = (website: Website) => {
        // Use placeholder or actual data if available
        return website.uptime_percentage !== undefined ? `${website.uptime_percentage}%` : '100%';
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Removed grid layout */}
            {websites.map((website, index) => (
                // Removed Card component, using divs and borders
                <div
                    key={website.id}
                    className={`flex items-center p-4 space-x-4 ${index < websites.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-colors`}
                >
                    {/* Checkbox */}
                    <Checkbox id={`select-${website.id}`} className="flex-shrink-0" />

                    {/* Status Dot */}
                    <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(website)}`}
                        title={getStatusText(website)}
                    />

                    {/* Monitor Info */}
                    <div className="flex-1 min-w-0">
                        <Link to={`/monitor/${website.id}`} className="block group">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                {website.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {website.monitorType === 'keyword' ? 'Keyword' : website.url} - {getStatusText(website)} {website.last_check_time ? dayjs(website.last_check_time).fromNow() : ''}
                            </p>
                        </Link>
                    </div>

                    {/* Check Interval */}
                    <div className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
                        <RotateCw className="inline-block h-3 w-3 mr-1" />
                        {website.check_interval_minutes || 5} min {/* Placeholder */}
                    </div>

                    {/* Uptime Bar/Percentage - Replace simple bar with HeartbeatBar */}
                    <div className="flex items-center space-x-2 flex-shrink-0 w-32 hidden md:flex"> {/* Increased width slightly */}
                        <HeartbeatBar
                            monitorId={website.id}
                            heartbeats={website.heartbeats || []} // Pass heartbeats
                            size="small" // Use 'small' size for list view
                            maxBeats={40} // Show recent beats
                        />
                        {/* Keep percentage display */}
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{getUptimeDisplay(website)}</span>
                    </div>

                    {/* Actions Dropdown */}
                    <div className="flex-shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/monitor/${website.id}`)}>
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(website.url, '_blank')}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> Open Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCheck(website.id)}>
                                    <RotateCw className="mr-2 h-4 w-4" /> Check Now
                                </DropdownMenuItem>
                                {/* Add Pause/Start based on state */}
                                {website.is_up !== undefined && ( // Example condition
                                    <DropdownMenuItem onClick={() => {/* Call onPause/onStart */}}>
                                        {website.is_up ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                        {website.is_up ? 'Pause' : 'Start'}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => {/* Trigger Edit Dialog */}}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(website.id)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            ))}

            {websites.length === 0 && (
                // Adjusted styling for empty state within the new container
                <div className="text-center py-12 px-4 text-gray-500">
                    No monitors added yet. Click the "+ New monitor" button to get started.
                </div>
            )}
        </div>
    );
};

export default WebsiteList;
