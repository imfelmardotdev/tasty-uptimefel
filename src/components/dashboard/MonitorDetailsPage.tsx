import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ExternalLink, Pause, Play, Edit, Trash2, BarChart, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'; // Add RefreshCw
 import HeartbeatBar from './HeartbeatBar';
 import EditWebsiteDialog from './EditWebsiteDialog'; // Import Edit Dialog
 import { useToast } from "@/components/ui/use-toast"; // Import useToast
 import monitoringService, { 
  Website as Monitor, 
  Heartbeat, 
  MonitorStatsSummary, 
  ImportantEvent, 
  Website,
  ChartDataPoint 
} from '@/services/monitoringService';
import PerformanceChart from './PerformanceChart';
 import dayjs from 'dayjs';
 import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Use types from monitoringService

const MonitorDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate(); // Initialize useNavigate
    const monitorId = parseInt(id || '0', 10);

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [stats, setStats] = useState<MonitorStatsSummary | null>(null);
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>([]); // Use specific type
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState('24h');
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State for edit dialog
     const { toast } = useToast(); // Initialize toast
     const [isChecking, setIsChecking] = useState(false); // State for check now button
 
     // --- Real Data Fetching ---
     const fetchMonitorData = async () => {
        // Keep loading true only on initial load
        // setLoading(true);
        setError(null);
        try {
            // Fetch all data concurrently
            const [
                monitorData,
                heartbeatData,
                statsData,
                eventData,
                chartData
            ] = await Promise.all([
                monitoringService.getWebsite(monitorId), // Fetch monitor details
                monitoringService.getRecentHeartbeats(monitorId, 100), // Fetch recent 100 heartbeats
                monitoringService.getMonitorStats(monitorId), // Fetch summary stats
                monitoringService.getImportantEvents(monitorId, 50), // Fetch last 50 important events
                monitoringService.getChartData(monitorId, chartTimeRange) // Fetch chart data
            ]);

                setMonitor(monitorData);
                setHeartbeats(heartbeatData);
                setStats(statsData);
                setImportantEvents(eventData);
                setChartData(chartData);

                // Log the fetched heartbeats for debugging
                console.log(`[MonitorDetailsPage] Heartbeats for monitor ${monitorId}:`, heartbeatData);

            } catch (err) {
            console.error("Error fetching monitor data:", err);
            setError("Failed to load monitor details. Please check the ID and try again.");
        } finally {
            // Only set loading false on initial load
            if (loading) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (monitorId > 0) {
            setLoading(true); // Set loading true on initial mount or ID change
            fetchMonitorData();
            // TODO: Setup WebSocket listener for real-time updates
        } else {
            setError("Invalid Monitor ID provided in URL.");
            setLoading(false);
        }

        // Cleanup WebSocket listener on unmount
        return () => {
            // TODO: Disconnect WebSocket listener
        };
    }, [monitorId]);
    // --- End Real Data Fetching ---

    const handlePause = async () => {
        if (!monitor) return;
        const originalState = monitor.active;
        try {
            // Optimistic update
            setMonitor(prev => prev ? { ...prev, active: false } : null);
            await monitoringService.updateWebsite(monitor.id, { active: false }); // Send boolean false
            toast({ title: "Monitor Paused", description: `${monitor.name} has been paused.` });
        } catch (err) {
             console.error("Error pausing monitor:", err);
             setMonitor(prev => prev ? { ...prev, active: originalState } : null);
             toast({ title: "Error", description: "Failed to pause monitor.", variant: "destructive" });
        }
    };
    const handleResume = async () => {
         if (!monitor) return;
         const originalState = monitor.active;
         try {
            // Optimistic update
            setMonitor(prev => prev ? { ...prev, active: true } : null);
            await monitoringService.updateWebsite(monitor.id, { active: true }); // Send boolean true
            toast({ title: "Monitor Resumed", description: `${monitor.name} has been resumed.` });
         } catch (err) {
              console.error("Error resuming monitor:", err);
              setMonitor(prev => prev ? { ...prev, active: originalState } : null);
              toast({ title: "Error", description: "Failed to resume monitor.", variant: "destructive" });
         }
    };
    const handleDelete = async () => {
        if (!monitor) return;
        // TODO: Replace window.confirm with shadcn AlertDialog
        if (window.confirm(`Are you sure you want to delete monitor "${monitor.name}"?`)) {
            try {
                await monitoringService.deleteWebsite(monitor.id);
                toast({ title: "Monitor Deleted", description: `${monitor.name} has been deleted.` });
                navigate('/dashboard'); // Navigate back to dashboard
            } catch (err) {
                 console.error("Error deleting monitor:", err);
                 toast({ title: "Error", description: "Failed to delete monitor.", variant: "destructive" });
            }
        }
     };
 
      // Handler for successful update from Edit dialog
      const handleUpdateWebsite = (updatedMonitor: Website) => {
          setMonitor(updatedMonitor); // Update local state with the data returned by the dialog's onUpdate prop
          setIsEditDialogOpen(false); // Close the dialog
          toast({ title: "Monitor Updated", description: `${updatedMonitor.name} settings saved.` });
      };

    // --- Handler for Check Now ---
    const handleCheckNow = async () => {
        if (!monitor) return;
        setIsChecking(true);
        try {
            await monitoringService.checkWebsiteNow(monitor.id);
            toast({
                title: "Check Triggered",
                description: `Manual check initiated for ${monitor.name}. Status will update shortly.`,
            });
            // Optionally, trigger a data refresh after a short delay to show new heartbeat
            setTimeout(fetchMonitorData, 3000); // Refresh after 3s
        } catch (err) {
            console.error("Error triggering check:", err);
            toast({
                title: "Error",
                description: "Failed to trigger manual check.",
                variant: "destructive",
            });
        } finally {
            setIsChecking(false);
        }
    };
    // --- End Handler for Check Now ---

    const getStatusColor = (status: number) => {
        switch (status) {
            case 1: return 'bg-green-500'; // UP
            case 0: return 'bg-red-500';   // DOWN
            case 2: return 'bg-yellow-500';// PENDING
            case 3: return 'bg-blue-500';  // MAINTENANCE
            default: return 'bg-gray-400'; // Unknown
        }
    };

     const getStatusText = (status: number) => {
        switch (status) {
            case 1: return 'Up';
            case 0: return 'Down';
            case 2: return 'Pending';
            case 3: return 'Maintenance';
            default: return 'Unknown';
        }
    };

    const formatUptime = (uptime?: number) => {
        if (uptime === undefined || uptime === null) return 'N/A';
        return `${(uptime * 100).toFixed(2)}%`;
    }

    if (loading) {
        return <div className="p-6">Loading monitor details...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-600">{error}</div>;
    }

    if (!monitor) {
        return <div className="p-6">Monitor not found.</div>;
    }

    const lastStatus = heartbeats[heartbeats.length - 1]?.status ?? -1;

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                {/* Header */}
                <div>
                    {/* Optional Breadcrumb/Link back */}
                    {/* <Link to="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link> */}
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center space-x-2">
                        <span>{monitor.name}</span>
                        <Badge variant={monitor.active ? "default" : "secondary"}>
                            {monitor.active ? 'Active' : 'Paused'}
                        </Badge>
                    </h1>
                    {monitor.description && <p className="text-gray-600 mt-1">{monitor.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                        {monitor.tags?.map(tag => (
                            <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</Badge>
                        ))}
                    </div>
                    <p className="text-sm text-blue-600 mt-2 break-all">
                        {/* Display relevant URL/Host based on type */}
                        {monitor.url && <a href={monitor.url} target="_blank" rel="noopener noreferrer">{monitor.url}</a>}
                         {monitor.hostname && <span>{monitor.hostname}{monitor.port ? `:${monitor.port}` : ''}</span>}
                         {/* Add more type-specific details here */}
                     </p>
                     {/* Display Monitor Type */}
                     <p className="text-sm text-gray-500 mt-1">
                         Type: <span className="font-medium capitalize">{monitor.monitorType}</span>
                     </p>
                 </div>
 
                 {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {monitor.active ? (
                        <Button variant="outline" size="sm" onClick={handlePause}><Pause className="mr-2 h-4 w-4" /> Pause</Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleResume}><Play className="mr-2 h-4 w-4" /> Resume</Button>
                    )}
                    {/* Edit button - opens dialog */}
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                    {/* Add Check Now button */}
                    <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={isChecking || !monitor.active}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? 'Checking...' : 'Check Now'}
                    </Button>
                    {/* Clone button removed */}
                    <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>

                {/* Heartbeat Bar & Current Status */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-grow">
                                <HeartbeatBar monitorId={monitor.id} heartbeats={heartbeats} size="big" />
                                <p className="text-xs text-gray-500 mt-1 text-center">Last {heartbeats.length} checks ({monitor.interval}s interval)</p>
                            </div>
                            <div className="flex-shrink-0 text-center md:text-right">
                                <Badge className={`text-lg px-4 py-1 ${getStatusColor(lastStatus)}`}>
                                    {getStatusText(lastStatus)}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                        <div className="p-2">
                            <p className="text-sm text-gray-500">Ping (Current)</p>
                            <p className="text-xl font-semibold">{stats?.currentPing ?? 'N/A'} ms</p>
                        </div>
                        <div className="p-2">
                            <p className="text-sm text-gray-500">Avg Ping (24h)</p>
                            <p className="text-xl font-semibold">{stats?.avgPing24h?.toFixed(0) ?? 'N/A'} ms</p>
                        </div>
                        <div className="p-2">
                            <p className="text-sm text-gray-500">Uptime (24h)</p>
                            <p className="text-xl font-semibold">{formatUptime(stats?.uptime24h)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-sm text-gray-500">Uptime (30d)</p>
                            <p className="text-xl font-semibold">{formatUptime(stats?.uptime30d)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-sm text-gray-500">Uptime (1y)</p>
                            <p className="text-xl font-semibold">{formatUptime(stats?.uptime1y)}</p>
                        </div>
                        {stats?.certExpiryDays !== undefined && stats?.certExpiryDays !== null && (
                            <div className="p-2 col-span-2 sm:col-span-1">
                                <p className="text-sm text-gray-500">Cert Expires</p>
                                <p className={`text-xl font-semibold ${stats.certExpiryDays < 7 ? 'text-red-600' : (stats.certExpiryDays < 30 ? 'text-yellow-600' : '')}`}>
                                    {stats.certExpiryDays} days
                                </p>
                                <p className="text-xs text-gray-500">({dayjs(stats.certValidTo).format('YYYY-MM-DD')})</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Performance Charts */}
                <PerformanceChart
                    websiteId={monitor.id.toString()}
                    websiteName={monitor.name}
                    performanceData={chartData}
                    thresholdMs={monitor.timeout_ms || 2000}
                    onTimeRangeChange={async (range) => {
                        setChartTimeRange(range);
                        try {
                            const newChartData = await monitoringService.getChartData(monitor.id, range);
                            setChartData(newChartData);
                        } catch (err) {
                            console.error('Error fetching chart data:', err);
                            toast({
                                title: "Error",
                                description: "Failed to load chart data",
                                variant: "destructive"
                            });
                        }
                    }}
                />

                {/* Optional: Certificate Info Card */}
                {stats?.certIssuer && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                {stats.isCertValid ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                                <span>Certificate Info</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><strong>Issuer:</strong> {stats.certIssuer}</p>
                            <p><strong>Valid Until:</strong> {dayjs(stats.certValidTo).format('YYYY-MM-DD HH:mm')}</p>
                            <p><strong>Status:</strong> {stats.isCertValid ? <span className="text-green-600">Valid</span> : <span className="text-red-600">Invalid/Expired</span>}</p>
                        </CardContent>
                    </Card>
                )}


                {/* Events Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-medium text-gray-600">Status</th>
                                        <th className="text-left p-2 font-medium text-gray-600">Timestamp</th>
                                        <th className="text-left p-2 font-medium text-gray-600">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importantEvents.length > 0 ? importantEvents.map((event) => (
                                        <tr key={event.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                            <td className="p-2">
                                                <Badge className={`${getStatusColor(event.status)} text-white`}>{getStatusText(event.status)}</Badge>
                                            </td>
                                            <td className="p-2 text-gray-700">{dayjs(event.timestamp).format('YYYY-MM-DD HH:mm:ss')} ({dayjs(event.timestamp).fromNow()})</td>
                                            <td className="p-2 text-gray-700">{event.message || '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="text-center p-4 text-gray-500">No important events recorded recently.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* TODO: Add pagination if needed */}
                    </CardContent>
                </Card>

            </div>

            {/* Edit Dialog */}
            <EditWebsiteDialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                websiteToEdit={monitor}
                onUpdate={handleUpdateWebsite}
            />
        </>
    );
};

export default MonitorDetailsPage;
