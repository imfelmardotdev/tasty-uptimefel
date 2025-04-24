import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, AlertTriangle } from 'lucide-react'; // Import necessary icons
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import HeartbeatBar from '../dashboard/HeartbeatBar'; // Reusing HeartbeatBar
import { Heartbeat } from '@/services/monitoringService'; // Import Heartbeat type

dayjs.extend(relativeTime);

// Interface for the data fetched from /api/public/status
interface PublicWebsiteStatus {
    id: number;
    name: string;
    url?: string;
    is_up: boolean | null;
    last_check_time: string | null;
    heartbeats?: Heartbeat[];
    // Add uptime percentages if/when backend provides them
    uptime_percent_90d?: number; // Keep for placeholder logic for now
}

// --- Placeholder Data Structures (Used only if API doesn't provide needed fields) ---
interface OverallUptimeStats {
    uptime_24h: number;
    uptime_7d: number;
    uptime_30d: number;
    uptime_90d: number;
}

interface StatusUpdate {
    id: number;
    timestamp: string;
    title: string;
    description: string;
    status: 'resolved' | 'investigating' | 'monitoring';
}

// Placeholder data for sections not yet covered by API
const placeholderOverallUptime: OverallUptimeStats = {
    uptime_24h: 0.000, // Placeholder
    uptime_7d: 0.070, // Placeholder
    uptime_30d: 0.070, // Placeholder
    uptime_90d: 0.070, // Placeholder
};
const placeholderStatusUpdates: StatusUpdate[] = []; // Placeholder
// --- End Placeholder Data ---


const PublicStatusPage = () => {
    const [statuses, setStatuses] = useState<PublicWebsiteStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStatuses = async () => {
        // Don't reset loading on interval fetches unless it's the initial load
        // setError(null); // Reset error each time? Maybe not, keep last error visible.
        try {
            const response = await fetch('/api/public/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: PublicWebsiteStatus[] = await response.json();
            setStatuses(data);
            setLastUpdated(new Date());
            setError(null); // Clear error on success
        } catch (err: any) {
            console.error("Failed to fetch public statuses:", err);
            setError(`Failed to load statuses: ${err.message || 'Unknown error'}`);
            // Keep existing statuses to show last known state
        } finally {
            setIsLoading(false); // Set loading false after first fetch attempt
        }
    };

    useEffect(() => {
        fetchStatuses(); // Initial fetch
        const intervalId = setInterval(fetchStatuses, 60000); // Refresh every 60 seconds
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, []); // Empty dependency array ensures this runs only once on mount

    const getStatusColorClass = (isUp: boolean | null) => {
        if (isUp === null) return 'bg-gray-400';
        return isUp ? 'bg-green-500' : 'bg-red-500';
    };
    const getStatusText = (isUp: boolean | null) => {
        if (isUp === null) return 'Pending';
        return isUp ? 'Up' : 'Down';
    };

    // Calculate overall status based on fetched data
    const isOverallDown = isLoading ? false : (statuses.length === 0 || statuses.some(s => s.is_up === false || s.is_up === null));
    const overallStatusText = isLoading ? 'Checking...' : (statuses.length === 0 ? 'No Monitors' : (isOverallDown ? 'Degraded' : 'Operational'));
    const overallStatusColor = isLoading ? 'bg-gray-400' : (statuses.length === 0 ? 'bg-gray-400' : (isOverallDown ? 'bg-red-500' : 'bg-green-500'));

    return (
        <div className="min-h-screen bg-gray-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                {/* Header Section */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap justify-between items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">Status page</h1>
                    <div className="text-sm text-gray-600 text-right">
                        <p className="font-medium">Service status</p>
                        <p>
                            {lastUpdated ? `Last updated ${dayjs(lastUpdated).format('HH:mm:ss A')}` : 'Updating...'}
                            {/* Placeholder for next update time */}
                        </p>
                    </div>
                </div>

                {/* Overall Status Card */}
                <Card className="bg-white p-4 rounded-lg shadow mb-6">
                    <CardContent className="p-0 flex items-center space-x-3">
                        <div className={`h-6 w-6 rounded-full flex-shrink-0 ${overallStatusColor}`}></div>
                        <span className="text-lg text-gray-800">All systems</span>
                        <span className={`text-lg font-semibold ${isOverallDown ? 'text-red-600' : 'text-green-600'}`}>
                            {overallStatusText}
                        </span>
                    </CardContent>
                </Card>

                {/* Uptime Section */}
                <div className="mb-6">
                    <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Uptime <span className="text-base font-normal text-gray-600">Last 90 days</span> {/* Period might need to be dynamic later */}
                        </h2>
                        {/* Removed Calendar link */}
                    </div>
                    <Card className="bg-white rounded-lg shadow overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading && statuses.length === 0 ? ( // Show loader only on initial load
                                <div className="p-6 text-center text-gray-500 flex justify-center items-center">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading monitors...
                                </div>
                            ) : error && statuses.length === 0 ? ( // Show error only if no data loaded previously
                                 <div className="p-6 text-center text-red-600 flex justify-center items-center">
                                     <AlertTriangle className="h-6 w-6 mr-2" /> {error}
                                 </div>
                            ) : !isLoading && statuses.length === 0 ? ( // No monitors configured
                                 <div className="p-6 text-center text-gray-500">No monitors configured for public status page.</div>
                            ) : (
                                // Render statuses even if there's an error, showing last known state
                                statuses.map((monitor, index) => (
                                <div key={monitor.id} className={`flex flex-wrap items-center p-4 gap-x-4 gap-y-2 ${index < statuses.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                    {/* Container for name and URL */}
                                    <div className="flex-1 min-w-[150px]">
                                        <div className="font-medium text-gray-800 truncate">{monitor.name}</div>
                                        {/* Added URL display */}
                                        <div className="text-xs text-gray-500 truncate">{monitor.url}</div>
                                    </div>
                                    {/* Conditionally Display uptime % */}
                                    {typeof monitor.uptime_percent_90d === 'number' ? (
                                        <div className="text-sm text-green-600 w-16 text-right flex-shrink-0">
                                            {`${monitor.uptime_percent_90d.toFixed(3)}%`}
                                        </div>
                                    ) : (
                                        <div className="w-16 flex-shrink-0"></div> // Render an empty div of the same width to maintain alignment
                                    )}
                                    {/* Wrapper for Heartbeat Bar and Status Indicator */}
                                    <div className="flex flex-grow items-center gap-x-2 min-w-[250px] w-full sm:w-auto">
                                        {/* Heartbeat Bar Container */}
                                        <div className="flex-grow min-w-[200px]">
                                            <HeartbeatBar
                                                monitorId={monitor.id}
                                                heartbeats={monitor.heartbeats || []}
                                                size="small"
                                                maxBeats={90} // Adjust based on desired timeframe (e.g., 90 for 90 days)
                                            />
                                        </div>
                                        {/* Status Indicator Container */}
                                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                                            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColorClass(monitor.is_up)}`}></div>
                                            <span className={`text-sm ${monitor.is_up === false ? 'text-red-600' : 'text-gray-600'}`}>{getStatusText(monitor.is_up)}</span>
                                        </div>
                                    </div>
                                </div>
                            )))}
                            {error && statuses.length > 0 && ( // Show error subtly if showing stale data
                                <div className="p-2 text-center text-xs text-red-500 bg-red-50 border-t border-red-200">
                                    Status update failed: {error}. Displaying last known status.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Overall Uptime Section (Using Placeholders) */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Uptime</h2>
                    <Card className="bg-white rounded-lg shadow">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{placeholderOverallUptime.uptime_24h.toFixed(3)}%</p>
                                    <p className="text-sm text-gray-500">Last 24 hours</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{placeholderOverallUptime.uptime_7d.toFixed(3)}%</p>
                                    <p className="text-sm text-gray-500">Last 7 days</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{placeholderOverallUptime.uptime_30d.toFixed(3)}%</p>
                                    <p className="text-sm text-gray-500">Last 30 days</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{placeholderOverallUptime.uptime_90d.toFixed(3)}%</p>
                                    <p className="text-sm text-gray-500">Last 90 days</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Updates Section (Using Placeholders) */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Status updates <span className="text-base font-normal text-gray-600">Last 30 days</span>
                    </h2>
                    <Card className="bg-white p-4 rounded-lg shadow mt-2">
                        <CardContent className="p-0">
                            {placeholderStatusUpdates.length === 0 ? (
                                <p className="text-gray-600">No incidents reported in the last 30 days.</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Map through placeholderStatusUpdates here when data is available */}
                                    <p className="text-gray-500 italic">Status update display not yet implemented.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                 <footer className="text-center text-gray-500 text-sm mt-12">
                   Powered by UptimeFel {/* Or your app name */}
                </footer>

            </div>
        </div>
    );
};

export default PublicStatusPage;
