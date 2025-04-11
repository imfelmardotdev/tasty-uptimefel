import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import StatusPanel from "./dashboard/StatusPanel";
import PerformanceChart from "./dashboard/PerformanceChart";
import AlertLog from "./dashboard/AlertLog";
import WebsiteForm from "./dashboard/WebsiteForm";
import DashboardLayout from "./layout/DashboardLayout";

const Home = () => {
  const [showWebsiteForm, setShowWebsiteForm] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);
  const [editingWebsite, setEditingWebsite] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== "undefined") {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);

      // For demo purposes, set logged in if not already set
      if (!loggedIn) {
        localStorage.setItem("isLoggedIn", "true");
        setIsLoggedIn(true);
      }
    }
  }, []);

  // Mock data for websites
  const [websites, setWebsites] = useState([
    {
      id: "1",
      url: "https://example.com",
      status: "up",
      responseTime: 245,
      lastChecked: new Date().toISOString(),
      threshold: 2000,
    },
    {
      id: "2",
      url: "https://google.com",
      status: "up",
      responseTime: 120,
      lastChecked: new Date().toISOString(),
      threshold: 2000,
    },
    {
      id: "3",
      url: "https://github.com",
      status: "down",
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      threshold: 1500,
    },
  ]);

  // Mock data for performance history
  const performanceData = {
    "https://example.com": Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      responseTime: Math.floor(Math.random() * 500) + 100,
    })),
    "https://google.com": Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      responseTime: Math.floor(Math.random() * 300) + 50,
    })),
    "https://github.com": Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      responseTime: i > 20 ? 0 : Math.floor(Math.random() * 600) + 200,
    })),
  };

  // Mock data for alerts
  const alerts = [
    {
      id: "1",
      websiteUrl: "https://github.com",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      type: "down",
      duration: "25m",
      details: "HTTP 503 Service Unavailable",
    },
    {
      id: "2",
      websiteUrl: "https://example.com",
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      type: "slow",
      duration: "5m",
      details: "Response time: 2.5s (threshold: 2s)",
    },
  ];

  const handleAddWebsite = () => {
    setEditingWebsite(null);
    setShowWebsiteForm(true);
  };

  const handleEditWebsite = (website: any) => {
    setEditingWebsite(website);
    setShowWebsiteForm(true);
  };

  const handleSaveWebsite = (websiteData: any) => {
    if (editingWebsite) {
      // Update existing website
      setWebsites(
        websites.map((w) =>
          w.id === editingWebsite.id ? { ...w, ...websiteData } : w,
        ),
      );
    } else {
      // Add new website
      if (websites.length < 5) {
        const newWebsite = {
          id: Date.now().toString(),
          ...websiteData,
          status: "pending",
          responseTime: 0,
          lastChecked: new Date().toISOString(),
        };
        setWebsites([...websites, newWebsite]);
      }
    }
    setShowWebsiteForm(false);
    setEditingWebsite(null);
  };

  const handleCloseForm = () => {
    setShowWebsiteForm(false);
    setEditingWebsite(null);
  };

  const handleSelectWebsite = (url: string) => {
    setSelectedWebsite(url);
  };

  const dashboardContent = (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Website Monitoring Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your websites' uptime and performance
        </p>
      </header>

      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Monitored Websites ({websites.length}/5)
          </h2>
          <Button
            onClick={handleAddWebsite}
            disabled={websites.length >= 5}
            className="flex items-center gap-2"
          >
            <PlusCircle size={16} />
            Add Website
          </Button>
        </div>

        <StatusPanel
          websites={websites}
          onEdit={handleEditWebsite}
          onSelect={handleSelectWebsite}
        />

        <Tabs defaultValue="performance" className="mt-6">
          <TabsList>
            <TabsTrigger value="performance">Performance Charts</TabsTrigger>
            <TabsTrigger value="alerts">Alert Log</TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time History</CardTitle>
                  <CardDescription>
                    {selectedWebsite
                      ? selectedWebsite
                      : "Select a website to view detailed performance"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceChart
                    data={
                      selectedWebsite ? performanceData[selectedWebsite] : []
                    }
                    threshold={
                      selectedWebsite
                        ? websites.find((w) => w.url === selectedWebsite)
                            ?.threshold || 2000
                        : 2000
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Website Performance Overview</CardTitle>
                  <CardDescription>
                    Last 24 hours response time averages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {websites.map((website) => {
                      const avgResponseTime = performanceData[website.url]
                        ? Math.round(
                            performanceData[website.url].reduce(
                              (sum, item) => sum + item.responseTime,
                              0,
                            ) / performanceData[website.url].length,
                          )
                        : 0;

                      return (
                        <div
                          key={website.id}
                          className="flex justify-between items-center p-3 border rounded-md"
                        >
                          <div>
                            <p className="font-medium">{website.url}</p>
                            <p className="text-sm text-muted-foreground">
                              Avg: {avgResponseTime}ms | Threshold:{" "}
                              {website.threshold}ms
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectWebsite(website.url)}
                          >
                            View Details
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Log</CardTitle>
                <CardDescription>
                  Recent downtime and performance issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertLog alerts={alerts} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showWebsiteForm && (
        <WebsiteForm
          website={editingWebsite}
          onSave={handleSaveWebsite}
          onCancel={handleCloseForm}
          isOpen={showWebsiteForm}
        />
      )}
    </div>
  );

  return <DashboardLayout>{dashboardContent}</DashboardLayout>;
};

export default Home;
