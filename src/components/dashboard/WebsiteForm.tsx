import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const monitorTypes = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'keyword', label: 'Keyword' }
] as const;

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  name: z.string().min(1, { message: "Name is required" }),
  // Rename responseThreshold to timeout_ms to match backend/service
  timeout_ms: z.coerce
    .number()
    .min(100, { message: "Timeout must be at least 100ms" })
    .max(30000, { message: "Timeout must be at most 30000ms" }), // Adjusted max timeout
  monitorType: z.enum(['http', 'https', 'keyword']),
  monitorConfig: z.object({
    verifySSL: z.boolean().optional(),
    expiryThreshold: z.coerce.number().min(1).max(90).optional(),
    keyword: z.string().optional(),
    caseSensitive: z.boolean().optional()
  }).optional()
});

export type WebsiteFormValues = z.infer<typeof formSchema>; // Export the type

interface WebsiteFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (data: WebsiteFormValues) => void;
  initialValues?: Partial<WebsiteFormValues>;
  isEditing?: boolean;
  maxWebsitesReached?: boolean;
}

const WebsiteForm = ({
  open = true,
  onOpenChange = () => {},
  onSubmit = () => {},
  initialValues = { // Use timeout_ms in default initialValues
    url: "",
    name: "",
    timeout_ms: 5000, // Default timeout
    monitorType: 'http', // Ensure default type is set
    monitorConfig: {},
  },
  isEditing = false,
  maxWebsitesReached = false,
}: WebsiteFormProps) => {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const handleSubmit = (data: WebsiteFormValues) => {
    try {
      setError(null);
      onSubmit(data);
      if (!isEditing) {
        form.reset();
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
  };

  const getDefaultMonitorConfig = (type: string) => {
    switch (type) {
      case 'https':
        return {
          verifySSL: true,
          expiryThreshold: 14 // Default 14 days warning for certificate expiry
        };
      case 'keyword':
        return {
          keyword: '',
          caseSensitive: false
        };
      default:
        return {};
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Website" : "Add Website"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the monitoring settings for this website."
              : "Add a new website to monitor its uptime and performance."}
          </DialogDescription>
        </DialogHeader>

        {maxWebsitesReached && !isEditing && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Maximum websites reached</AlertTitle>
            <AlertDescription>
              You can monitor up to 5 websites. Please remove a website before
              adding a new one.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="monitorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monitor Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset monitor config when type changes
                      form.setValue('monitorConfig', getDefaultMonitorConfig(value));
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a monitor type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monitorTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how you want to monitor this website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Website" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The full URL to monitor (including https://)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeout_ms" // Use timeout_ms
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel> 
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Time before a request is considered failed (in milliseconds)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show HTTPS specific fields */}
            {form.watch('monitorType') === 'https' && (
              <>
                <FormField
                  control={form.control}
                  name="monitorConfig.verifySSL"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Verify SSL Certificate</FormLabel>
                        <FormDescription>
                          Check certificate validity and trust chain
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monitorConfig.expiryThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Expiry Threshold (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Alert when certificate expires within this many days
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Show Keyword specific fields */}
            {form.watch('monitorType') === 'keyword' && (
              <>
                <FormField
                  control={form.control}
                  name="monitorConfig.keyword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keyword</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter keyword to monitor" />
                      </FormControl>
                      <FormDescription>
                        Monitor will check if this keyword exists in the response
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monitorConfig.caseSensitive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Case Sensitive</FormLabel>
                        <FormDescription>
                          Match keyword exactly as entered
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={maxWebsitesReached && !isEditing}>
                {isEditing ? "Update" : "Add"} Website
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteForm;
