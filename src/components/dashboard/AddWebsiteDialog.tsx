import React from 'react';
import WebsiteForm from './WebsiteForm'; // Import the shared form component
import monitoringService from '@/services/monitoringService'; // Import the default export

interface AddWebsiteDialogProps {
    open: boolean;
    onClose: () => void;
    maxWebsitesReached: boolean;
}

const AddWebsiteDialog: React.FC<AddWebsiteDialogProps> = ({ open, onClose, maxWebsitesReached }) => {

    const handleAddWebsite = async (data: any) => {
        // The WebsiteForm already structures the data correctly,
        // including monitorType and monitorConfig
        try {
            await monitoringService.addWebsite(data); // Call the method on the imported service object
            onClose(); // Close dialog on success
        } catch (error) {
            console.error("Failed to add website:", error);
            // Error handling can be enhanced in WebsiteForm itself or here
        }
    };

    return (
        <WebsiteForm
            open={open}
            onOpenChange={onClose} // Use onClose to handle dialog state
            onSubmit={handleAddWebsite}
            isEditing={false}
            maxWebsitesReached={maxWebsitesReached}
            // Provide initial values including a default monitor type
            initialValues={{
                url: "",
                name: "",
                timeout_ms: 5000, // Use timeout_ms instead of responseThreshold
                monitorType: 'http', // Default to HTTP
                monitorConfig: {} // Default empty config
            }}
        />
    );
};

export default AddWebsiteDialog;
