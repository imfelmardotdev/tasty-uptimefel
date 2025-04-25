import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import monitoringService, { NotificationSettings } from '@/services/monitoringService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

 // Define the form schema using Zod
 const formSchema = z.object({
     webhook_url: z.string(), // Allow any string (backend handles empty/invalid URL if needed)
     webhook_enabled: z.boolean(),
 });

type NotificationSettingsFormValues = z.infer<typeof formSchema>;

const NotificationSettingsPage: React.FC = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<NotificationSettingsFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            webhook_url: '',
            webhook_enabled: false,
        },
    });

    // Fetch current settings on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const settings = await monitoringService.getNotificationSettings();
                // Reset form with fetched values
                form.reset({
                    webhook_url: settings.webhook_url || '',
                    webhook_enabled: settings.webhook_enabled || false,
                });
            } catch (error) {
                console.error("Failed to fetch notification settings:", error);
                toast({
                    title: "Error",
                    description: "Failed to load notification settings.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [form, toast]); // Dependencies

    // Handle form submission
     const onSubmit = async (values: NotificationSettingsFormValues) => {
         setIsSaving(true);
         try {
             // Explicitly create the object with the required type
             const settingsToSave: Omit<NotificationSettings, 'id'> = {
                 webhook_url: values.webhook_url,
                 webhook_enabled: values.webhook_enabled
             };
             await monitoringService.updateNotificationSettings(settingsToSave);
             toast({
                 title: "Success",
                description: "Notification settings updated successfully.",
            });
            // Optionally re-fetch or just update form state if needed,
            // but backend returns updated data which we can trust for now.
            form.reset(values); // Reset form with the saved values to clear dirty state
        } catch (error) {
            console.error("Failed to update notification settings:", error);
            toast({
                title: "Error",
                description: "Failed to save notification settings.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-4">Notification Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Webhook Notifications</CardTitle>
                    <CardDescription>
                        Configure a webhook URL to receive notifications when a monitored website's status changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Loading settings...</p> // TODO: Add Skeleton loader
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="webhook_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Webhook URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://your-webhook-endpoint.com/..." {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                The URL where status change notifications will be sent via POST request. Leave empty to disable.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="webhook_enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">
                                                    Enable Webhook Notifications
                                                </FormLabel>
                                                <FormDescription>
                                                    Send notifications to the configured URL when a monitor goes up or down.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={!form.watch('webhook_url')} // Disable if URL is empty
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default NotificationSettingsPage;
