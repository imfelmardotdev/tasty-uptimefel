import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ExternalLink, Trash2, RotateCw } from 'lucide-react';
import dayjs from 'dayjs';
import HeartbeatBar from './HeartbeatBar'; // Import the new component
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Website {
    id: number;
    name: string;
    url: string;
    last_check_time?: string;
    is_up?: boolean;
    last_status_code?: number;
    last_response_time?: number;
    last_error?: string;
    heartbeats?: any[]; // Placeholder for heartbeat data
}

interface WebsiteListProps {
    websites: Website[];
    onDelete: (id: number) => void;
    onCheck: (id: number) => void;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ websites, onDelete, onCheck }) => {
    const getStatusColor = (website: Website) => {
        if (website.is_up === undefined) return 'bg-gray-200';
        return website.is_up ? 'bg-green-500' : 'bg-red-500';
    };

    const getStatusText = (website: Website) => {
        if (website.is_up === undefined) return 'Not checked';
        return website.is_up ? 'Up' : 'Down';
    };

    const formatResponseTime = (ms?: number) => {
        if (!ms) return 'N/A';
        return `${ms}ms`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {websites.map(website => (
                <Card key={website.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    {/* Wrap content in Link, but keep header separate */}
                    <div className="p-6">
                        {/* Header with Status and Buttons */}
                        <div className="flex items-center space-x-2 mb-4">
                            <div
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(website)}`}
                                title={getStatusText(website)}
                            />
                            {/* Link only the name */}
                            <Link to={`/monitor/${website.id}`} className="text-lg font-semibold truncate flex-1 hover:underline">
                                {website.name}
                            </Link>
                            {/* Action Buttons */}
                            <div className="flex space-x-1 flex-shrink-0">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => window.open(website.url, '_blank')}
                                    title="Open website"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onCheck(website.id)}
                                    title="Check now"
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onDelete(website.id)}
                                    className="text-red-600 hover:text-red-700"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {/* Link the rest of the content */}
                        <Link to={`/monitor/${website.id}`} className="block cursor-pointer">
                            <div className="text-sm text-gray-500 truncate mb-4">
                                {website.url}
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                <span className={website.is_up ? 'text-green-600' : 'text-red-600'}>
                                    {getStatusText(website)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Response Time:</span>
                                <span>{formatResponseTime(website.last_response_time)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Status Code:</span>
                                <span>{website.last_status_code || 'N/A'}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Last Checked:</span>
                                <span>
                                    {website.last_check_time
                                        ? dayjs(website.last_check_time).fromNow()
                                        : 'Never'}
                                </span>
                            </div>

                            {website.last_error && (
                                <div className="mt-2 text-red-600 text-xs">
                                    Error: {website.last_error}
                                </div>
                            )}
                        </div>

                        {/* Add HeartbeatBar below the details */}
                        <div className="mt-4">
                           <HeartbeatBar
                             monitorId={website.id}
                             heartbeats={website.heartbeats || []} // Pass heartbeats or empty array
                             size="mid" // Or 'small' depending on desired size
                             maxBeats={40} // Adjust number of beats shown
                            />
                         </div>
                        </Link>
                    </div>
                </Card>
            ))}

            {websites.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                    No websites added yet. Click the "Add Website" button to get started.
                </div>
            )}
        </div>
    );
};

export default WebsiteList;
