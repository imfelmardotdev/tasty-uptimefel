import { v4 as uuidv4 } from "uuid";

export interface Website {
  id: string;
  name: string;
  url: string;
  responseThreshold: number;
  status?: "up" | "down" | "pending";
  responseTime?: number;
  lastChecked?: string;
  responseCode?: number;
}

export interface Alert {
  id: string;
  websiteId: string;
  websiteName: string;
  url: string;
  timestamp: string;
  duration: number; // in seconds
  type: "down" | "slow";
  responseTime?: number; // in ms
  responseCode?: number;
  resolved: boolean;
}

// Use a CORS proxy to bypass cross-origin restrictions
const CORS_PROXY = "https://corsproxy.io/?";

class MonitoringService {
  private websites: Website[] = [];
  private alerts: Alert[] = [];
  private checkInterval: number = 60000; // 1 minute in ms
  private intervalId: number | null = null;
  private listeners: { [key: string]: Function[] } = {
    websitesUpdated: [],
    alertsUpdated: [],
  };

  constructor() {
    this.loadFromStorage();
  }

  // Initialize the monitoring service
  public init(): void {
    this.loadFromStorage();
    this.startMonitoring();
  }

  // Start the monitoring interval
  public startMonitoring(): void {
    if (this.intervalId) return;

    // Immediately check all websites
    this.checkAllWebsites();

    // Then set up interval for regular checks
    this.intervalId = window.setInterval(() => {
      this.checkAllWebsites();
    }, this.checkInterval);
  }

  // Stop the monitoring interval
  public stopMonitoring(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Add a new website to monitor
  public addWebsite(
    website: Omit<Website, "id" | "status" | "responseTime" | "lastChecked">,
  ): Website {
    if (this.websites.length >= 5) {
      throw new Error("Maximum of 5 websites can be monitored");
    }

    const newWebsite: Website = {
      id: uuidv4(),
      ...website,
      status: "pending",
      responseTime: 0,
      lastChecked: new Date().toISOString(),
    };

    this.websites.push(newWebsite);
    this.saveToStorage();
    this.notifyListeners("websitesUpdated");

    // Check the new website immediately
    this.checkWebsite(newWebsite.id);

    return newWebsite;
  }

  // Update an existing website
  public updateWebsite(
    id: string,
    updates: Partial<Omit<Website, "id">>,
  ): Website {
    const index = this.websites.findIndex((w) => w.id === id);
    if (index === -1) throw new Error("Website not found");

    this.websites[index] = { ...this.websites[index], ...updates };
    this.saveToStorage();
    this.notifyListeners("websitesUpdated");

    // Check the updated website immediately
    this.checkWebsite(id);

    return this.websites[index];
  }

  // Remove a website from monitoring
  public removeWebsite(id: string): void {
    this.websites = this.websites.filter((w) => w.id !== id);
    this.saveToStorage();
    this.notifyListeners("websitesUpdated");
  }

  // Get all monitored websites
  public getWebsites(): Website[] {
    return [...this.websites];
  }

  // Get a specific website by ID
  public getWebsite(id: string): Website | undefined {
    return this.websites.find((w) => w.id === id);
  }

  // Get all alerts
  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  // Clear all alerts
  public clearAlerts(): void {
    this.alerts = [];
    this.saveToStorage();
    this.notifyListeners("alertsUpdated");
  }

  // Check the status of all websites
  private async checkAllWebsites(): Promise<void> {
    const checkPromises = this.websites.map((website) =>
      this.checkWebsite(website.id),
    );
    await Promise.all(checkPromises);
  }

  // Check the status of a specific website
  private async checkWebsite(id: string): Promise<void> {
    const website = this.websites.find((w) => w.id === id);
    if (!website) return;

    const startTime = Date.now();
    const now = new Date().toISOString();

    try {
      // Use the CORS proxy to make the request
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(website.url)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(proxyUrl, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
        headers: {
          Accept: "text/html",
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const previousStatus = website.status;
      const newStatus = response.ok ? "up" : "down";

      // Update the website status
      const updatedWebsite: Website = {
        ...website,
        status: newStatus,
        responseTime,
        lastChecked: now,
        responseCode: response.status,
      };

      const index = this.websites.findIndex((w) => w.id === id);
      this.websites[index] = updatedWebsite;

      // Check if we need to create an alert
      if (previousStatus === "up" && newStatus === "down") {
        this.createAlert(updatedWebsite, "down");
      } else if (responseTime > website.responseThreshold) {
        this.createAlert(updatedWebsite, "slow");
      }

      // Check if we need to resolve an alert
      if (previousStatus === "down" && newStatus === "up") {
        this.resolveAlerts(id);
      }

      this.saveToStorage();
      this.notifyListeners("websitesUpdated");
    } catch (error) {
      // Handle network errors or timeouts
      const updatedWebsite: Website = {
        ...website,
        status: "down",
        responseTime: 0,
        lastChecked: now,
        responseCode: 0,
      };

      const index = this.websites.findIndex((w) => w.id === id);
      this.websites[index] = updatedWebsite;

      // Create a down alert if the website was previously up
      if (website.status === "up") {
        this.createAlert(updatedWebsite, "down");
      }

      this.saveToStorage();
      this.notifyListeners("websitesUpdated");
    }
  }

  // Create a new alert for a website
  private createAlert(website: Website, type: "down" | "slow"): void {
    const alert: Alert = {
      id: uuidv4(),
      websiteId: website.id,
      websiteName: website.name,
      url: website.url,
      timestamp: new Date().toISOString(),
      duration: 0, // Will be updated when resolved
      type,
      responseTime: website.responseTime,
      responseCode: website.responseCode,
      resolved: false,
    };

    this.alerts.unshift(alert); // Add to the beginning of the array
    this.saveToStorage();
    this.notifyListeners("alertsUpdated");
  }

  // Resolve all active alerts for a website
  private resolveAlerts(websiteId: string): void {
    const now = new Date();

    this.alerts = this.alerts.map((alert) => {
      if (alert.websiteId === websiteId && !alert.resolved) {
        const alertTime = new Date(alert.timestamp);
        const durationSeconds = Math.floor(
          (now.getTime() - alertTime.getTime()) / 1000,
        );

        return {
          ...alert,
          resolved: true,
          duration: durationSeconds,
        };
      }
      return alert;
    });

    this.saveToStorage();
    this.notifyListeners("alertsUpdated");
  }

  // Save the current state to localStorage
  private saveToStorage(): void {
    localStorage.setItem("monitoredWebsites", JSON.stringify(this.websites));
    localStorage.setItem("websiteAlerts", JSON.stringify(this.alerts));
  }

  // Load the state from localStorage
  private loadFromStorage(): void {
    try {
      const websitesJson = localStorage.getItem("monitoredWebsites");
      const alertsJson = localStorage.getItem("websiteAlerts");

      if (websitesJson) {
        this.websites = JSON.parse(websitesJson);
      }

      if (alertsJson) {
        this.alerts = JSON.parse(alertsJson);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }

  // Subscribe to updates
  public subscribe(
    event: "websitesUpdated" | "alertsUpdated",
    callback: Function,
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Unsubscribe from updates
  public unsubscribe(
    event: "websitesUpdated" | "alertsUpdated",
    callback: Function,
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  // Notify all listeners of an event
  private notifyListeners(event: string): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback());
  }
}

// Create a singleton instance
const monitoringService = new MonitoringService();
export default monitoringService;
