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

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  name: z.string().min(1, { message: "Name is required" }),
  responseThreshold: z.coerce
    .number()
    .min(100, { message: "Threshold must be at least 100ms" })
    .max(10000, { message: "Threshold must be at most 10000ms" }),
});

type WebsiteFormValues = z.infer<typeof formSchema>;

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
  initialValues = {
    url: "",
    name: "",
    responseThreshold: 2000,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background">
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
              name="responseThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Time Threshold (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Alert will trigger if response time exceeds this threshold
                    (in milliseconds)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
