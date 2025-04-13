import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Corrected import path
import { Plus } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext'; // No longer needed directly
import AddWebsiteDialog from './AddWebsiteDialog';
import WebsiteList from './WebsiteList';
import monitoringService, { Website as WebsiteData, Heartbeat } from '@/services/monitoringService'; // Import service and types

// Use interface from service, add heartbeats field
interface Website extends WebsiteData {
    heartbeats?: Heartbeat[];
}

const MonitoringDashboard = () => {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

    const handleAddWebsite = async (websiteData: Omit<WebsiteData, 'id'>) => {
        try {
            const newWebsite = await monitoringService.addWebsite(websiteData);
            // Add with empty heartbeats initially, fetchWebsites will populate later if needed
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">{import.meta.env.VITE_APP_NAME || 'Website Monitoring'}</h1>
                    <p className="text-sm text-muted-foreground">{import.meta.env.VITE_APP_DESCRIPTION || 'Monitor your websites easily.'}</p>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-primary text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Website
                </Button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <WebsiteList
                websites={websites}
                onDelete={handleDeleteWebsite}
                onCheck={handleCheckWebsite}
            />

            <AddWebsiteDialog
                open={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onAdd={handleAddWebsite}
            />
        </div>
    );
};

export default MonitoringDashboard;
