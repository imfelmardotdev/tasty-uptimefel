import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // For Search
import { Checkbox } from '@/components/ui/checkbox'; // For Bulk Select
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'; // For dropdowns
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'; // For Select dropdowns
import { Plus, ChevronDown, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
// import AddWebsiteDialog from './AddWebsiteDialog'; // Removed import
import WebsiteForm, { WebsiteFormValues } from './WebsiteForm'; // Import WebsiteForm and its value type
import WebsiteList from './WebsiteList';
import monitoringService, { Website as WebsiteData, Heartbeat } from '@/services/monitoringService';
import CurrentStatusPanel from './CurrentStatusPanel'; // Import Status Panel
import RecentStatsPanel from './RecentStatsPanel';   // Import Status Panel
import { useMemo } from 'react'; // Import useMemo

// Use interface from service, add heartbeats field
interface Website extends WebsiteData {
    heartbeats?: Heartbeat[];
}

const MonitoringDashboard = () => {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State for search input
    const [sortOption, setSortOption] = useState('down-first'); // State for sort dropdown
    // const { token } = useAuth(); // Removed
    const navigate = useNavigate();

    // Fetch websites on component mount
    useEffect(() => {
        fetchWebsites();
        // Set up polling interval
        const interval = setInterval(fetchWebsites, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []); // Empty dependency array means run once on mount

    const fetchWebsites = async () => {
        // Don't reset loading state on subsequent polls
        // setIsLoading(true);
        try {
            const fetchedWebsites = await monitoringService.getWebsites();

            // Fetch heartbeats for each website concurrently
            const websitesWithHeartbeats = await Promise.all(
                fetchedWebsites.map(async (website) => {
                    try {
                        // Fetch a limited number of heartbeats for the list view
                        const heartbeats = await monitoringService.getRecentHeartbeats(website.id, 40);
                        return { ...website, heartbeats };
                    } catch (hbError) {
                        console.error(`Error fetching heartbeats for ${website.name} (ID: ${website.id}):`, hbError);
                        return { ...website, heartbeats: [] }; // Return website even if heartbeats fail
                    }
                })
            );

            setWebsites(websitesWithHeartbeats);
            setError(null);
        } catch (err) {
            setError('Error loading websites data');
            console.error('Error fetching websites:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Update handleAddWebsite to accept WebsiteFormValues
    const handleAddWebsite = async (formData: WebsiteFormValues) => {
        try {
            // Explicitly construct the object to ensure type compatibility
            const websiteData: Omit<WebsiteData, 'id'> = {
                name: formData.name,
                url: formData.url,
                monitorType: formData.monitorType,
                timeout_ms: formData.timeout_ms,
                monitorConfig: formData.monitorConfig || {},
                active: true, // Add default active state
                // Add other optional fields from Website interface if needed,
                // otherwise they default to undefined which is acceptable
            };
            const newWebsite = await monitoringService.addWebsite(websiteData);
            // Add with empty heartbeats initially, fetchWebsites will populate later
            setWebsites(prev => [...prev, { ...newWebsite, heartbeats: [] }]);
            setIsAddDialogOpen(false);
            // Optionally trigger an immediate check for the new site
            // await monitoringService.checkWebsiteNow(newWebsite.id);
        } catch (err) {
            console.error('Error adding website:', err);
            // TODO: Show error toast to user
            setError('Failed to add website');
        }
    };

    const handleDeleteWebsite = async (id: number) => {
        // Optional: Add confirmation dialog here
        if (!window.confirm("Are you sure you want to delete this website?")) {
            return;
        }
        try {
            await monitoringService.deleteWebsite(id);
            setWebsites(prev => prev.filter(website => website.id !== id));
             // TODO: Show success toast
        } catch (err) {
            console.error('Error deleting website:', err);
            // TODO: Show error toast
            setError('Failed to delete website');
        }
    };

    const handleCheckWebsite = async (id: number) => {
        try {
            await monitoringService.checkWebsiteNow(id);
             // TODO: Show "Check triggered" toast
            // Optionally, trigger a single website refresh after a short delay
            // setTimeout(() => fetchSingleWebsite(id), 2000); // Implement fetchSingleWebsite if needed
            // Or rely on the next polling interval
        } catch (err) {
            console.error('Error triggering website check:', err);
            // TODO: Show error toast
            setError('Failed to check website');
        }
    };

    // Filter and sort websites based on searchTerm and sortOption
    const filteredAndSortedWebsites = useMemo(() => {
        let filtered = websites.filter(website =>
            website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            website.url.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Create a copy before sorting to ensure React detects the change
        const sorted = [...filtered];

        switch (sortOption) {
            case 'down-first':
                sorted.sort((a, b) => {
                    // Use loose equality (==) to handle boolean or integer (0/1) values
                    const statusA = a.is_up == false ? 0 : (a.is_up == true ? 1 : 2); // down=0, up=1, unknown=2
                    const statusB = b.is_up == false ? 0 : (b.is_up == true ? 1 : 2);
                    return statusA - statusB;
                });
                break;
            case 'up-first':
                 sorted.sort((a, b) => {
                    // Use loose equality (==)
                    const statusA = a.is_up == true ? 0 : (a.is_up == false ? 1 : 2); // up=0, down=1, unknown=2
                    const statusB = b.is_up == true ? 0 : (b.is_up == false ? 1 : 2);
                    return statusA - statusB;
                });
                break;
            case 'name-asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default:
                // Default to down-first if sortOption is unexpected
                 sorted.sort((a, b) => {
                    // Use loose equality (==)
                    const statusA = a.is_up == false ? 0 : (a.is_up == true ? 1 : 2);
                    const statusB = b.is_up == false ? 0 : (b.is_up == true ? 1 : 2);
                    return statusA - statusB;
                });
        }

        return sorted; // Return the sorted copy
    }, [websites, searchTerm, sortOption]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        // Removed container mx-auto px-4 py-8, padding is handled by DashboardLayout
        <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-gray-900">Website monitor</h1>
                {/* Optional: Add subtitle if needed */}
            </div>

            {/* Action Bar - Added responsive flex classes */}
            <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                {/* Left side controls - Allow wrapping */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-3">
                    {/* Checkbox - REMOVED */}
                    {/* Bulk Actions Dropdown - REMOVED */}
                    {/* Tags Dropdown - REMOVED */}
                </div>
                 {/* Right side controls - Allow wrapping, ensure search takes available space */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-2 flex-grow justify-end md:flex-nowrap">
                     <Input
                        type="search"
                        placeholder="Search by name or url"
                        className="h-9 w-full sm:w-auto sm:max-w-xs flex-grow" // Allow input to grow
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {/* Sort Dropdown */}
                    <Select value={sortOption} onValueChange={setSortOption} defaultValue="down-first">
                         {/* Consider hiding text on small screens if needed */}
                        <SelectTrigger className="w-auto sm:w-[150px] h-9 text-sm flex-shrink-0">
                            <ArrowUpDown className="mr-1 h-3 w-3" />
                            <span className="hidden sm:inline"><SelectValue placeholder="Sort by..." /></span>
                             <span className="sm:hidden">Sort</span> {/* Show simple text on mobile */}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="down-first">Down first</SelectItem>
                            <SelectItem value="up-first">Up first</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Filter Button - REMOVED */}
                    {/* Add New Monitor Button */}
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9" // Updated style
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New monitor
                    </Button>
                </div>
            </div>

            {/* Main Content Area (List + Status Panels) - Added responsive grid classes */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monitor List - Takes full width on small, 2/3 on large */}
                <div className="lg:col-span-2 order-2 lg:order-1"> {/* Change order on mobile */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                    {/* WebsiteList content itself might need further responsive adjustments */}
                    <WebsiteList
                        websites={filteredAndSortedWebsites} // Pass the filtered and sorted list
                        onDelete={handleDeleteWebsite}
                        onCheck={handleCheckWebsite}
                    />
                </div>

                {/* Status Panels Sidebar - Takes full width on small, 1/3 on large */}
                <div className="lg:col-span-1 space-y-6 order-1 lg:order-2"> {/* Change order on mobile */}
                    <CurrentStatusPanel />
                    <RecentStatsPanel />
                </div>
            </div>


            {/* Use WebsiteForm directly for adding */}
            <WebsiteForm
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen} // Pass the state setter directly
                onSubmit={handleAddWebsite}
                isEditing={false} // Explicitly set isEditing to false
                maxWebsitesReached={false} // Placeholder
                // initialValues are handled by default in WebsiteForm for adding
            />
        </div>
    );
};

export default MonitoringDashboard;
