import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddWebsiteDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (website: WebsiteData) => void;
}

interface WebsiteData {
    name: string;
    url: string;
    check_interval?: number;
    timeout_ms?: number;
    retry_count?: number;
    accepted_status_codes?: string;
    follow_redirects?: boolean;
    max_redirects?: number;
}

const AddWebsiteDialog: React.FC<AddWebsiteDialogProps> = ({ open, onClose, onAdd }) => {
    const [formData, setFormData] = useState<WebsiteData>({
        name: '',
        url: '',
        check_interval: 300,
        timeout_ms: 5000,
        retry_count: 1,
        accepted_status_codes: '200-299',
        follow_redirects: true,
        max_redirects: 5
    });

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name.trim() || !formData.url.trim()) {
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

        onAdd(formData);
        handleClose();
    };

    const handleClose = () => {
        setFormData({
            name: '',
            url: '',
            check_interval: 300,
            timeout_ms: 5000,
            retry_count: 1,
            accepted_status_codes: '200-299',
            follow_redirects: true,
            max_redirects: 5
        });
        setError(null);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError(null);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Website to Monitor</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Website Name</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="My Website"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                            id="url"
                            name="url"
                            value={formData.url}
                            onChange={handleChange}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="check_interval">Check Interval (seconds)</Label>
                            <Input
                                id="check_interval"
                                name="check_interval"
                                type="number"
                                value={formData.check_interval}
                                onChange={handleChange}
                                min={60}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timeout_ms">Timeout (ms)</Label>
                            <Input
                                id="timeout_ms"
                                name="timeout_ms"
                                type="number"
                                value={formData.timeout_ms}
                                onChange={handleChange}
                                min={1000}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="retry_count">Retry Count</Label>
                            <Input
                                id="retry_count"
                                name="retry_count"
                                type="number"
                                value={formData.retry_count}
                                onChange={handleChange}
                                min={1}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_redirects">Max Redirects</Label>
                            <Input
                                id="max_redirects"
                                name="max_redirects"
                                type="number"
                                value={formData.max_redirects}
                                onChange={handleChange}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="accepted_status_codes">Accepted Status Codes</Label>
                        <Input
                            id="accepted_status_codes"
                            name="accepted_status_codes"
                            value={formData.accepted_status_codes}
                            onChange={handleChange}
                            placeholder="200-299,301,302"
                        />
                        <p className="text-sm text-gray-500">
                            Comma-separated list of status codes or ranges (e.g., 200-299,301,302)
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="follow_redirects"
                            name="follow_redirects"
                            checked={formData.follow_redirects}
                            onChange={handleChange}
                            className="rounded border-gray-300"
                        />
                        <Label htmlFor="follow_redirects">Follow Redirects</Label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Website</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddWebsiteDialog;
