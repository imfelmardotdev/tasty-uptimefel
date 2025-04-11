import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Globe,
  Wifi,
  WifiOff,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Website {
  id: string;
  name?: string;
  url: string;
  status: "up" | "down";
  responseTime: number;
  lastChecked: string;
  responseCode?: number;
  uptime?: number; // Percentage of uptime
  incidents?: number; // Number of incidents in the last 24 hours
  currentDowntime?: string; // How long the site has been down (if applicable)
  lastIncidentTime?: string; // Timestamp of the last incident
}

interface PublicStatusPageProps {
  websites?: Website[];
}

const PublicStatusPage = ({
  websites = [
    {
      id: "1",
      name: "Example Website",
      url: "https://example.com",
      status: "up",
      responseTime: 245,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
      uptime: 99.95,
      incidents: 1,
    },
    {
      id: "2",
      name: "API Service",
      url: "https://api.example.org",
      status: "up",
      responseTime: 189,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
      uptime: 100,
      incidents: 0,
    },
    {
      id: "3",
      name: "Down Example",
      url: "https://down.example.net",
      status: "down",
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      responseCode: 503,
      uptime: 93.2,
      incidents: 2,
      currentDowntime: "5h 5m 51s",
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

  // Function to render uptime status bars like in the image
  const renderUptimeStatusBars = (uptime: number = 100) => {
    // Create an array of 24 bars (representing 24 hours)
    const bars = Array(24).fill(0);
    // Determine how many bars should be red based on uptime percentage
    const redBars = Math.floor((100 - uptime) / 4);

    return (
      <div className="flex space-x-0.5">
        {bars.map((_, index) => (
          <div
            key={index}
            className={`h-4 w-1 rounded-sm ${index >= bars.length - redBars ? "bg-destructive" : "bg-green-500"}`}
          />
        ))}
      </div>
    );
  };

  // Function to format uptime percentage
  const formatUptime = (uptime: number = 100) => {
    return uptime.toFixed(3) + "%";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">System Status</h1>
        <p className="text-muted-foreground mt-2">
          Current status of our services
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {websites.map((website) => (
          <Card
            key={website.id}
            className="overflow-hidden border-l-4 bg-card"
            style={{
              borderLeftColor: website.status === "up" ? "#22c55e" : "#ef4444",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-bold">
                      {website.name || website.url.replace(/^https?:\/\//, "")}
                    </CardTitle>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {website.url.replace(/^https?:\/\//, "")}
                  </div>
                </div>
                <Badge
                  variant={website.status === "up" ? "default" : "destructive"}
                  className={website.status === "up" ? "bg-green-500" : ""}
                >
                  {website.status === "up" ? "Online" : "Offline"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current status section */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium">Current status</h3>
                    <span className="text-sm text-muted-foreground">
                      Last checked: {formatTime(website.lastChecked)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xl font-bold text-destructive">
                      {website.status === "down" ? "Down" : "Up"}
                    </div>
                    {website.status === "down" && website.currentDowntime && (
                      <div className="text-sm text-muted-foreground">
                        Currently down for {website.currentDowntime}
                      </div>
                    )}
                  </div>
                </div>

                {/* Last 24 hours section */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium">Last 24 hours</h3>
                    <span className="font-medium">
                      {formatUptime(website.uptime)}
                    </span>
                  </div>
                  {renderUptimeStatusBars(website.uptime)}
                  <div className="text-sm text-muted-foreground mt-1">
                    {website.incidents || 0} incident
                    {website.incidents !== 1 ? "s" : ""} in the last 24 hours
                  </div>
                </div>

                {/* Response time section */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium">Response time</h3>
                    <span
                      className={getResponseTimeClass(website.responseTime)}
                    >
                      {website.responseTime} ms
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, (website.responseTime / 2000) * 100)}
                    className="h-2"
                    indicatorClassName={getResponseTimeClass(
                      website.responseTime,
                    ).replace("text-", "bg-")}
                  />
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
