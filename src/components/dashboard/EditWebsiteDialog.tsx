import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Use correct imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Website } from '@/services/monitoringService'; // Import main Website type

// Define the shape of the form data, excluding fields not edited here (like id, status, etc.)
type EditableWebsiteData = Pick<
    Website,
    'name' | 'url' | 'interval' | 'timeout_ms' | 'retry_count' | 'accepted_statuses' | 'follow_redirects' | 'max_redirects'
>;

interface EditWebsiteDialogProps {
    open: boolean;
    onClose: () => void;
    websiteToEdit: Website | null; // Pass the website object to edit
    onUpdate: (id: number, data: Partial<EditableWebsiteData>) => void; // Callback for update
}

const EditWebsiteDialog: React.FC<EditWebsiteDialogProps> = ({ open, onClose, websiteToEdit, onUpdate }) => {
    // Initialize form data state
    const [formData, setFormData] = useState<Partial<EditableWebsiteData>>({});
    const [error, setError] = useState<string | null>(null);

    // Populate form when websiteToEdit changes (dialog opens)
    useEffect(() => {
        if (websiteToEdit) {
            setFormData({
                name: websiteToEdit.name || '',
                url: websiteToEdit.url || '',
                interval: websiteToEdit.interval || 300,
                timeout_ms: websiteToEdit.timeout_ms || 5000,
                retry_count: websiteToEdit.retry_count || 1,
                accepted_statuses: websiteToEdit.accepted_statuses || '200-299',
                follow_redirects: websiteToEdit.follow_redirects !== undefined ? websiteToEdit.follow_redirects : true,
                max_redirects: websiteToEdit.max_redirects || 5,
            });
            setError(null); // Clear errors when opening
        } else {
             // Reset form if no website is passed (e.g., dialog closed improperly)
             setFormData({});
        }
    }, [websiteToEdit, open]); // Depend on websiteToEdit and open state

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!websiteToEdit) {
            setError("No website selected for editing.");
            return;
        }

        // Basic validation
        if (!formData.name?.trim() || !formData.url?.trim()) {
            setError('Name and URL are required');
            return;
        }

        // URL validation
        try {
            new URL(formData.url);
        } catch {
            setError('Please enter a valid URL');
            return;
        }

        // Prepare data, converting types as needed
        const updateData: Partial<EditableWebsiteData> = {
            ...formData,
            interval: Number(formData.interval) || undefined,
            timeout_ms: Number(formData.timeout_ms) || undefined,
            retry_count: Number(formData.retry_count) || undefined,
            max_redirects: Number(formData.max_redirects) || undefined,
        };


        onUpdate(websiteToEdit.id, updateData);
        // onClose(); // Let the parent handle closing after successful update
    };

    // Generic change handler for inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null); // Clear error on change
    };

     // Specific handler for checkbox
     const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
        setFormData(prev => ({
            ...prev,
            follow_redirects: !!checked // Ensure boolean
        }));
    };


    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Website Monitor</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Website Name</Label>
                        <Input
                            id="edit-name"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            placeholder="My Website"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-url">URL</Label>
                        <Input
                            id="edit-url"
                            name="url"
                            value={formData.url || ''}
                            onChange={handleChange}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-interval">Check Interval (seconds)</Label>
                            <Input
                                id="edit-interval"
                                name="interval"
                                type="number"
                                value={formData.interval || ''}
                                onChange={handleChange}
                                min={60}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-timeout_ms">Timeout (ms)</Label>
                            <Input
                                id="edit-timeout_ms"
                                name="timeout_ms"
                                type="number"
                                value={formData.timeout_ms || ''}
                                onChange={handleChange}
                                min={1000}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-retry_count">Retry Count</Label>
                            <Input
                                id="edit-retry_count"
                                name="retry_count"
                                type="number"
                                value={formData.retry_count || ''}
                                onChange={handleChange}
                                min={0} // Allow 0 retries
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-max_redirects">Max Redirects</Label>
                            <Input
                                id="edit-max_redirects"
                                name="max_redirects"
                                type="number"
                                value={formData.max_redirects || ''}
                                onChange={handleChange}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-accepted_status_codes">Accepted Status Codes</Label>
                        <Input
                            id="edit-accepted_status_codes"
                            name="accepted_statuses" // Match backend field name if different
                            value={formData.accepted_statuses || ''}
                            onChange={handleChange}
                            placeholder="200-299,301,302"
                        />
                        <p className="text-sm text-gray-500">
                            Comma-separated list of status codes or ranges (e.g., 200-299,301,302)
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                         <Checkbox
                            id="edit-follow_redirects"
                            name="follow_redirects"
                            checked={formData.follow_redirects}
                            onCheckedChange={handleCheckboxChange} // Use onCheckedChange for shadcn Checkbox
                        />
                        <Label htmlFor="edit-follow_redirects">Follow Redirects</Label>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditWebsiteDialog;
