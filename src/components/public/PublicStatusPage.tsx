import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card'; // Removed CardHeader, CardTitle
import { Badge } from '../ui/badge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import HeartbeatBar from '../dashboard/HeartbeatBar'; // Import HeartbeatBar
import { Heartbeat } from '@/services/monitoringService'; // Import Heartbeat type

dayjs.extend(relativeTime);

interface PublicWebsiteStatus {
    id: number;
    name: string;
    url?: string; // Make URL optional if not always returned
    is_up: boolean | null; // Can be null initially
    last_check_time: string | null;
    heartbeats?: Heartbeat[]; // Add heartbeats array
}

const PublicStatusPage = () => {
    const [statuses, setStatuses] = useState<PublicWebsiteStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStatuses = async () => {
        // Keep loading true only on initial load
        // setIsLoading(true); // Removed for subsequent fetches
        setError(null);
        try {
            const response = await fetch('/api/public/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: PublicWebsiteStatus[] = await response.json();
            setStatuses(data);
            setLastUpdated(new Date());
        } catch (err: any) {
            console.error("Failed to fetch public statuses:", err);
            setError(`Failed to load statuses: ${err.message || 'Unknown error'}`);
            // Don't clear statuses on error, show last known state
        } finally {
            // Only set loading false on initial load
            if (isLoading) setIsLoading(false); 
        }
    };

    useEffect(() => {
        fetchStatuses(); // Initial fetch
        const intervalId = setInterval(fetchStatuses, 60000); // Refresh every 60 seconds

        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, []); // Empty dependency array ensures this runs only once on mount

    const getStatusBadge = (isUp: boolean | null) => {
        if (isUp === null || isUp === undefined) {
            return <Badge variant="secondary">Pending</Badge>;
        }
        return isUp ? 
            <Badge variant="default" className="bg-green-500 text-white">Up</Badge> : 
            <Badge variant="destructive">Down</Badge>;
    };

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
                    {import.meta.env.VITE_APP_NAME || 'Website Status'}
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Current status of monitored services.
                    {lastUpdated && (
                         <span className="block text-sm">Last updated: {dayjs(lastUpdated).format('YYYY-MM-DD HH:mm:ss')} ({dayjs(lastUpdated).fromNow()})</span>
                    )}
                </p>

                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                )}

                {error && !isLoading && (
                    <Card className="bg-red-50 border-red-200 mb-6">
                        <CardContent className="pt-6">
                            <p className="text-red-700 text-center">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && statuses.length === 0 && (
                     <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                            <p className="text-blue-700 text-center">No websites are currently being monitored.</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && statuses.length > 0 && (
                    <div className="space-y-4">
                        {statuses.map((site) => (
                            // Removed console.log here
                            <Card key={site.id} className="shadow-sm">
                                {/* Make CardContent the flex container */}
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    {/* Site Name and Last Check */}
                                    <div className="flex-grow min-w-0"> {/* Allow shrinking and prevent overflow */}
                                        <p className="font-semibold text-lg truncate">{site.name}</p>
                                        {/* Optionally display URL - consider privacy */}
                                        {/* <p className="text-sm text-gray-500">{site.url}</p> */}
                                        <p className="text-xs text-gray-500 mt-1">
                                            Last check: {site.last_check_time ? dayjs(site.last_check_time).fromNow() : 'Never'}
                                        </p>
                                    </div>
                                    {/* Heartbeat Bar in the middle */}
                                    <div className="flex-1 mx-2 sm:mx-4 min-w-[150px] sm:min-w-[200px]"> {/* Adjust min-width as needed */}
                                        <HeartbeatBar
                                            monitorId={site.id}
                                            heartbeats={site.heartbeats || []}
                                            size="small" // Use smaller size
                                            maxBeats={40} // Adjust beats shown
                                        />
                                    </div>
                                    {/* Status Badge at the end */}
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(site.is_up)}
                                    </div>
                                </CardContent>
                                {/* Removed second CardContent */}
                            </Card>
                        ))}
                    </div>
                )}
                 <footer className="text-center text-gray-500 text-sm mt-12">
                   UptimeFel
                </footer>
            </div>
        </div>
    );
};

export default PublicStatusPage;
