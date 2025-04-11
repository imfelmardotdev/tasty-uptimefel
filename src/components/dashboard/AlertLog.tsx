import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Clock, Globe } from "lucide-react";

interface Alert {
  id: string;
  websiteId: string;
  websiteName: string;
  url: string;
  timestamp: Date;
  duration: number; // in seconds
  type: "down" | "slow";
  responseTime?: number; // in ms
  responseCode?: number;
  resolved: boolean;
}

interface AlertLogProps {
  alerts?: Alert[];
  onFilterChange?: (filter: string) => void;
  onClearAlerts?: () => void;
}

const AlertLog = ({
  alerts = [
    {
      id: "1",
      websiteId: "site1",
      websiteName: "Example Website",
      url: "https://example.com",
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      duration: 120, // 2 minutes
      type: "down",
      responseCode: 503,
      resolved: true,
    },
    {
      id: "2",
      websiteId: "site2",
      websiteName: "Test API",
      url: "https://api.test.com",
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      duration: 180, // 3 minutes
      type: "slow",
      responseTime: 3500, // 3.5 seconds
      responseCode: 200,
      resolved: true,
    },
    {
      id: "3",
      websiteId: "site3",
      websiteName: "Production Server",
      url: "https://production.example.org",
      timestamp: new Date(),
      duration: 0, // ongoing
      type: "down",
      responseCode: 500,
      resolved: false,
    },
  ],
  onFilterChange = () => {},
  onClearAlerts = () => {},
}: AlertLogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter alerts based on search term and active tab
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.websiteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.url.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && !alert.resolved;
    if (activeTab === "resolved") return matchesSearch && alert.resolved;
    if (activeTab === "down") return matchesSearch && alert.type === "down";
    if (activeTab === "slow") return matchesSearch && alert.type === "slow";

    return matchesSearch;
  });

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "Ongoing";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Card className="w-full h-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Alert Log
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAlerts}
            disabled={filteredAlerts.length === 0}
          >
            Clear All
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onFilterChange(e.target.value);
              }}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="down">Down</TabsTrigger>
            <TabsTrigger value="slow">Slow</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[250px] pr-4">
              {filteredAlerts.length > 0 ? (
                <div className="space-y-3">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-md border ${alert.resolved ? "bg-background" : "bg-destructive/5 border-destructive/20"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {alert.websiteName}
                            <Badge
                              variant={
                                alert.type === "down"
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {alert.type === "down" ? "Down" : "Slow"}
                            </Badge>
                            {!alert.resolved && (
                              <Badge
                                variant="outline"
                                className="bg-destructive/10 text-destructive border-destructive/20"
                              >
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {alert.url}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(alert.timestamp)}{" "}
                          {formatTime(alert.timestamp)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            Duration: {formatDuration(alert.duration)}
                          </span>
                        </div>
                        {alert.responseCode && (
                          <div>
                            Status:{" "}
                            <span
                              className={
                                alert.responseCode >= 400
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {alert.responseCode}
                            </span>
                          </div>
                        )}
                        {alert.responseTime && (
                          <div>
                            Response:{" "}
                            <span
                              className={
                                alert.responseTime > 2000
                                  ? "text-amber-500"
                                  : ""
                              }
                            >
                              {alert.responseTime}ms
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                  <p>No alerts found</p>
                  {searchTerm && (
                    <p className="text-sm">Try adjusting your search</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlertLog;
