import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Edit, Globe, RefreshCw, Wifi, WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Website {
  id: string;
  url: string;
  status: "up" | "down";
  responseTime: number;
  lastChecked: string;
  responseCode?: number;
}

interface StatusPanelProps {
  websites?: Website[];
  onRefresh?: () => void;
  onEdit?: (websiteId: string) => void;
}

const StatusPanel = ({
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
    {
      id: "4",
      url: "https://slow.example.io",
      status: "up",
      responseTime: 2350,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
    },
    {
      id: "5",
      url: "https://blog.example.com",
      status: "up",
      responseTime: 320,
      lastChecked: new Date().toISOString(),
      responseCode: 200,
    },
  ],
  onRefresh = () => {},
  onEdit = () => {},
}: StatusPanelProps) => {
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
    <div className="bg-background w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Website Status</h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {websites.map((website) => (
          <Card key={website.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-muted-foreground" />
                  <CardTitle className="text-base truncate max-w-[200px]">
                    {website.url.replace(/^https?:\/\//, "")}
                  </CardTitle>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(website.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit website</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="font-medium">HTTP Code:</span>
                  </div>
                  <span>{website.responseCode || "N/A"}</span>
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

export default StatusPanel;
