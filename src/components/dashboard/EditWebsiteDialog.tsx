import React, { useEffect, useMemo } from 'react';
import WebsiteForm, { WebsiteFormValues } from './WebsiteForm'; // Import the shared form component and its type
import monitoringService, { Website } from '@/services/monitoringService'; // Import service and type

interface EditWebsiteDialogProps {
    open: boolean;
    onClose: () => void;
    websiteToEdit: Website | null; // Pass the full website object
    onUpdate: (updatedWebsite: Website) => void; // Callback after successful update
}

const EditWebsiteDialog: React.FC<EditWebsiteDialogProps> = ({ open, onClose, websiteToEdit, onUpdate }) => {

    const handleUpdateWebsite = async (data: any) => {
        if (!websiteToEdit) return;

        // The WebsiteForm structures the data correctly
        try {
            const updatedWebsite = await monitoringService.updateWebsite(websiteToEdit.id, data);
            onUpdate(updatedWebsite); // Pass updated data back
            onClose(); // Close dialog on success
        } catch (error) {
            console.error("Failed to update website:", error);
            // Error handling can be enhanced in WebsiteForm itself or here
        }
    };

    // Prepare initial values for the form, parsing monitor_config if it exists
    const initialFormValues = useMemo((): Partial<WebsiteFormValues> => { // Explicitly type the return value
        if (!websiteToEdit) {
            // Return type must match Partial<WebsiteFormValues>
            return {
                url: "",
                name: "",
                timeout_ms: 5000, // Use timeout_ms
                monitorType: 'http', // Default type, satisfies the enum
                monitorConfig: {}, // Default empty config
            };
        }

        let parsedConfig = {};
        // Use camelCase property 'monitorConfig' from the Website interface
        if (websiteToEdit.monitorConfig && typeof websiteToEdit.monitorConfig === 'string') {
            try {
                parsedConfig = JSON.parse(websiteToEdit.monitorConfig);
            } catch (e) {
                console.error("Failed to parse monitorConfig:", e);
                // Use default empty config if parsing fails
            }
        } else if (typeof websiteToEdit.monitorConfig === 'object' && websiteToEdit.monitorConfig !== null) {
             parsedConfig = websiteToEdit.monitorConfig; // Already an object
        }

        // Define the expected monitor type values and type guard
        const validMonitorTypes = ['http', 'https', 'keyword'] as const;
        type ValidMonitorType = typeof validMonitorTypes[number];
        const isMonitorType = (type: any): type is ValidMonitorType => validMonitorTypes.includes(type);

        // Validate and set monitorType
        const currentMonitorType: ValidMonitorType = isMonitorType(websiteToEdit.monitorType)
            ? websiteToEdit.monitorType
            : 'http'; // Default to 'http' if invalid or missing

        // Return only the fields defined in the WebsiteForm schema
        // Ensure the return type matches Partial<WebsiteFormValues>
        const values: Partial<WebsiteFormValues> = {
            url: websiteToEdit.url || "",
            name: websiteToEdit.name || "",
            timeout_ms: websiteToEdit.timeout_ms || 5000, // Use timeout_ms
            monitorType: currentMonitorType,
            monitorConfig: parsedConfig,
        };
        return values;
    }, [websiteToEdit]);


    // Need to ensure the form resets or updates when the dialog reopens with a different website
    // WebsiteForm uses react-hook-form, which handles this via the key prop or reset function.
    // We'll pass a key based on the website ID to force re-render.
    const formKey = websiteToEdit ? `edit-${websiteToEdit.id}` : 'edit-new';

    return (
        <WebsiteForm
            key={formKey} // Force re-render when websiteToEdit changes
            open={open}
            onOpenChange={onClose}
            onSubmit={handleUpdateWebsite}
            isEditing={true}
            initialValues={initialFormValues}
        />
    );
};

export default EditWebsiteDialog;
