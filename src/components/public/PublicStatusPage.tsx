import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe, Wifi, WifiOff } from "lucide-react";

interface Website {
  id: string;
  url: string;
  status: "up" | "down";
  responseTime: number;
  lastChecked: string;
  responseCode?: number;
}

interface PublicStatusPageProps {
  websites?: Website[];
}

const PublicStatusPage = ({
  websites = [
    {
      id: "1",
      url: "https://example.com",
      status: "up",
      responseTime: 245,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
    },
    {
      id: "2",
      url: "https://api.example.org",
      status: "up",
      responseTime: 189,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
    },
    {
      id: "3",
      url: "https://down.example.net",
      status: "down",
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      responseCode: 503,
    },
  ],
}: PublicStatusPageProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getResponseTimeClass = (time: number) => {
    if (time === 0) return "text-destructive";
    if (time > 2000) return "text-amber-500";
    if (time > 1000) return "text-amber-400";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">System Status</h1>
        <p className="text-muted-foreground mt-2">
          Current status of our services
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {websites.map((website) => (
          <Card key={website.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-muted-foreground" />
                <CardTitle className="text-base truncate max-w-[200px]">
                  {website.url.replace(/^https?:\/\//, "")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {website.status === "up" ? (
                      <Wifi className="h-5 w-5 mr-2 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 mr-2 text-destructive" />
                    )}
                    <span className="font-medium">Status:</span>
                  </div>
                  <Badge
                    variant={
                      website.status === "up" ? "default" : "destructive"
                    }
                    className={website.status === "up" ? "bg-green-500" : ""}
                  >
                    {website.status === "up" ? "Online" : "Offline"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span className="font-medium">Response Time:</span>
                  </div>
                  <span className={getResponseTimeClass(website.responseTime)}>
                    {website.responseTime} ms
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Last checked:</span>
                  <span>{formatTime(website.lastChecked)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PublicStatusPage;
