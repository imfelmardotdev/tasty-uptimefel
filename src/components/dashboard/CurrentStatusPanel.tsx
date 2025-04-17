import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, PauseCircle, Loader2, AlertTriangle } from 'lucide-react'; // Import necessary icons
import monitoringService, { DashboardSummary } from '@/services/monitoringService'; // Import service and type

const CurrentStatusPanel = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await monitoringService.getDashboardSummary();
                setSummary(data);
            } catch (err) {
                console.error("Error fetching dashboard summary:", err);
                setError("Failed to load summary");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
        // Optional: Add polling interval if needed
        // const interval = setInterval(fetchSummary, 60000); // Every minute
        // return () => clearInterval(interval);
    }, []);

    const getStatusIcon = () => {
        if (isLoading || !summary) return <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />;
        if (error) return <AlertTriangle className="h-8 w-8 text-red-500" />;
        if (summary.down > 0) return <ArrowDownCircle className="h-8 w-8 text-red-600" />;
        if (summary.up > 0) return <ArrowUpCircle className="h-8 w-8 text-green-600" />;
        if (summary.paused > 0) return <PauseCircle className="h-8 w-8 text-gray-500" />;
        return <ArrowUpCircle className="h-8 w-8 text-green-600" />; // Default to up if all zero?
    };

     const getStatusIconBg = () => {
        if (isLoading || !summary || error) return 'bg-gray-100';
        if (summary.down > 0) return 'bg-red-100';
        if (summary.up > 0) return 'bg-green-100';
        if (summary.paused > 0) return 'bg-gray-100';
        return 'bg-green-100';
    };


    return (
        <Card className="shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                    Current status.
                </CardTitle>
                {/* Optional: Add ellipsis/menu button here */}
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center mb-4 h-16"> {/* Added fixed height */}
                     {/* Large Status Indicator */}
                    <div className={`p-4 ${getStatusIconBg()} rounded-full`}>
                        {getStatusIcon()}
                    </div>
                </div>
                {isLoading ? (
                     <div className="text-center text-gray-500">Loading...</div>
                ) : error ? (
                     <div className="text-center text-red-500">{error}</div>
                ) : summary ? (
                    <>
                        <div className="flex justify-around text-center mb-2">
                            <div>
                                <p className="text-2xl font-bold text-red-600">{summary.down}</p>
                                <p className="text-xs text-gray-500">Down</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">{summary.up}</p>
                                <p className="text-xs text-gray-500">Up</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-500">{summary.paused}</p>
                                <p className="text-xs text-gray-500">Paused</p>
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-4">
                            {/* Assuming 'total' from summary is the count of user's monitors */}
                            {/* If you need a separate 'max monitors' limit, fetch that separately */}
                            Using {summary.total} monitors.
                        </p>
                    </>
                ) : (
                     <div className="text-center text-gray-500">No data available.</div>
                )}
            </CardContent>
        </Card>
    );
};

export default CurrentStatusPanel;
