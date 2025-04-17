import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react'; // Import necessary icons
import monitoringService, { DashboardSummary } from '@/services/monitoringService'; // Import service and type

const RecentStatsPanel = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

     useEffect(() => {
        const fetchSummary = async () => {
            // No need to reset loading/error here if CurrentStatusPanel already did
            // Assuming they load together or this loads slightly after
            try {
                const data = await monitoringService.getDashboardSummary();
                setSummary(data);
            } catch (err) {
                console.error("Error fetching dashboard summary for recent stats:", err);
                setError("Failed to load stats");
            } finally {
                setIsLoading(false); // Still manage loading state for this panel
            }
        };

        fetchSummary();
        // Optional: Add polling interval if needed, sync with CurrentStatusPanel if desired
        // const interval = setInterval(fetchSummary, 60000);
        // return () => clearInterval(interval);
    }, []);


    return (
        <Card className="shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                    Last 24 hours.
                </CardTitle>
                 {/* Optional: Add ellipsis/menu button here */}
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                     <div className="text-center text-gray-500 py-8"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
                ) : error ? (
                     <div className="text-center text-red-500 py-8"><AlertTriangle className="h-6 w-6 mx-auto mb-2" />{error}</div>
                ) : summary ? (
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-center">
                        <div>
                            <p className="text-2xl font-bold text-green-600">{summary.overallUptime24h?.toFixed(2) ?? 'N/A'}%</p>
                            <p className="text-xs text-gray-500">Overall uptime</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{summary.incidents24h ?? 'N/A'}</p>
                            <p className="text-xs text-gray-500">Incidents</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{summary.daysWithoutIncidents ?? 'N/A'}d</p>
                            <p className="text-xs text-gray-500">Without incid.</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{summary.affectedMonitors24h ?? 'N/A'}</p>
                            <p className="text-xs text-gray-500">Affected mon.</p>
                        </div>
                    </div>
                 ) : (
                     <div className="text-center text-gray-500 py-8">No data available.</div>
                 )}
            </CardContent>
        </Card>
    );
};

export default RecentStatsPanel;
