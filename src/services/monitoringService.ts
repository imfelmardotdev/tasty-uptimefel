import axios from 'axios';
import { getToken } from './authService'; // Use named import for getToken

// Define the base URL for the API using the same logic as authService
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // Use env var or default to relative path

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL, // Set base URL (will be empty string for Vercel, http://localhost:3001 for local)
});

// Add an interceptor to include the auth token in requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken(); // Use the imported function directly
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Define interfaces based on backend models/API responses
// These might need adjustments based on the actual API output
export interface MonitorConfig {
  verifySSL?: boolean;
  expiryThreshold?: number;
  keyword?: string;
  caseSensitive?: boolean;
}

export interface Website {
  id: number;
  name: string;
  url: string;
  monitorType: 'http' | 'https' | 'keyword';
  monitorConfig?: MonitorConfig;
  interval?: number;
  description?: string;
  tags?: { id: number; name: string; color?: string }[];
  active: boolean;
  hostname?: string;
  port?: number;
  timeout_ms?: number;
  follow_redirects?: boolean;
  max_redirects?: number;
  accepted_statuses?: string;
  retry_count?: number;
  is_up?: boolean;
  last_check_time?: string;
  last_status_code?: number;
  last_response_time?: number;
  last_error?: string;
  certInfo?: {
    valid: boolean;
    expires: string;
    issuer: string;
    daysUntilExpiration: number;
  };
}

export interface Heartbeat {
  // Assuming backend returns these fields for /heartbeats endpoint
  id: number; // Added id
  website_id: number; // Added website_id
  timestamp: string | Date;
  status: number;
  ping?: number | null;
  message?: string | null;
  // id and website_id might not be needed directly in frontend for bar
}

export interface MonitorStatsSummary {
  // Assuming backend returns these for /summary endpoint
  currentPing?: number | null;
  avgPing24h?: number | null;
  uptime24h?: number;
  uptime30d?: number;
  uptime1y?: number;
  certExpiryDays?: number | null;
  certIssuer?: string | null;
  certValidTo?: string | null;
  isCertValid?: boolean | null;
}

export interface ImportantEvent {
   // Assuming backend returns these for /events endpoint
   id: number;
   timestamp: string | Date;
   status: number;
   message?: string | null;
}

export interface ChartDataPoint {
    timestamp: string;
    responseTime: number;
    status: "up" | "down";
    uptime: number;
    requestCount: number;
    successCount: number;
    failureCount: number;
}

// Define interface for the new dashboard summary endpoint
export interface DashboardSummary {
    up: number;
    down: number;
    paused: number;
    total: number;
    // Add fields from backend placeholder data
    overallUptime24h?: number;
    incidents24h?: number;
    daysWithoutIncidents?: number;
     affectedMonitors24h?: number;
 }
 
 // Define interface for Notification Settings
 export interface NotificationSettings {
     id: number; // Should always be 1 for the single global row
     webhook_url: string;
     webhook_enabled: boolean;
 }
 

const monitoringService = {
  // --- Website CRUD ---
  async getWebsites(): Promise<Website[]> {
    try {
      // Path should be relative to the mount point + apiClient baseURL
      // If baseURL is '/api', this becomes '/api/websites'
      // If baseURL is '', this becomes '/api/websites' (handled by Vercel routing)
      // If baseURL is 'http://localhost:3001', this becomes 'http://localhost:3001/websites'
      const response = await apiClient.get<Website[]>('/websites'); // Removed /api prefix
      return response.data;
    } catch (error) {
      console.error('Error fetching websites:', error);
      throw error; // Re-throw to be handled by the caller
    }
  },

  async getWebsite(id: number): Promise<Website> {
    try {
      const response = await apiClient.get<Website>(`/websites/${id}`); // Removed /api prefix
      return response.data;
    } catch (error) {
      console.error(`Error fetching website ${id}:`, error);
      throw error;
    }
  },

  async addWebsite(websiteData: Omit<Website, 'id'>): Promise<Website> {
    try {
      const response = await apiClient.post<Website>('/websites', websiteData); // Removed /api prefix
      return response.data;
    } catch (error) {
      console.error('Error adding website:', error);
      throw error;
    }
  },

  async updateWebsite(id: number, websiteData: Partial<Omit<Website, 'id'>>): Promise<Website> {
    try {
      const response = await apiClient.put<Website>(`/websites/${id}`, websiteData); // Removed /api prefix
      return response.data;
    } catch (error) {
      console.error(`Error updating website ${id}:`, error);
      throw error;
    }
  },

  async deleteWebsite(id: number): Promise<void> {
    try {
      await apiClient.delete(`/websites/${id}`); // Removed /api prefix
    } catch (error) {
      console.error(`Error deleting website ${id}:`, error);
      throw error;
    }
  },

   async checkWebsiteNow(id: number): Promise<void> {
      try {
        // Assuming an endpoint exists to trigger an immediate check
        await apiClient.post(`/websites/${id}/check`); // Removed /api prefix
      } catch (error) {
        console.error(`Error triggering check for website ${id}:`, error);
       throw error;
     }
   },

  // --- Stats & Heartbeats ---
  // These routes likely start with /stats, relative to the /api base URL
  async getRecentHeartbeats(monitorId: number, limit: number = 100): Promise<Heartbeat[]> {
    try {
      const response = await apiClient.get<Heartbeat[]>(`/stats/monitor/${monitorId}/heartbeats`, { // Removed /api prefix
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching recent heartbeats for monitor ${monitorId}:`, error);
      throw error;
    }
  },

  async getMonitorStats(monitorId: number): Promise<MonitorStatsSummary> {
    try {
      const response = await apiClient.get<MonitorStatsSummary>(`/stats/monitor/${monitorId}/summary`); // Removed /api prefix
      return response.data;
    } catch (error) {
      console.error(`Error fetching stats summary for monitor ${monitorId}:`, error);
      throw error;
    }
  },

  async getImportantEvents(monitorId: number, limit: number = 50): Promise<ImportantEvent[]> {
     try {
       const response = await apiClient.get<ImportantEvent[]>(`/stats/monitor/${monitorId}/events`, { // Removed /api prefix
         params: { limit },
       });
       return response.data;
     } catch (error) {
       console.error(`Error fetching important events for monitor ${monitorId}:`, error);
       throw error;
     }
   },

   async getChartData(monitorId: number, period: string = '24h'): Promise<ChartDataPoint[]> {
     try {
       const response = await apiClient.get<ChartDataPoint[]>(`/stats/monitor/${monitorId}/chart`, { // Removed /api prefix
         params: { period },
       });
       return response.data;
     } catch (error) {
       console.error(`Error fetching chart data for monitor ${monitorId} (${period}):`, error);
       throw error;
     }
   },

   // --- Dashboard Summary ---
   async getDashboardSummary(): Promise<DashboardSummary> {
     try {
       const response = await apiClient.get<DashboardSummary>('/stats/summary'); // Removed /api prefix
       return response.data;
     } catch (error) {
       console.error('Error fetching dashboard summary:', error);
       throw error;
      }
    },
 
   // --- Notification Settings ---
   async getNotificationSettings(): Promise<NotificationSettings> {
     try {
       // Path is relative to apiClient baseURL + /notifications/settings
       const response = await apiClient.get<NotificationSettings>('/notifications/settings');
       return response.data;
     } catch (error) {
       console.error('Error fetching notification settings:', error);
       throw error;
     }
   },
 
   async updateNotificationSettings(settings: Omit<NotificationSettings, 'id'>): Promise<NotificationSettings> {
     try {
       const response = await apiClient.put<NotificationSettings>('/notifications/settings', settings);
       return response.data;
     } catch (error) {
       console.error('Error updating notification settings:', error);
       throw error;
     }
   },
 
   // --- Listener pattern (optional, for WebSocket integration later) ---
   // listeners: { [key: string]: Function[] } = {
  //   monitorUpdate: [], // Example event name
  // },

  // subscribe(event: string, callback: Function): void {
  //   if (!this.listeners[event]) {
  //     this.listeners[event] = [];
  //   }
  //   this.listeners[event].push(callback);
  //   // TODO: Initialize WebSocket connection if this is the first subscriber?
  // },

  // unsubscribe(event: string, callback: Function): void {
  //   if (!this.listeners[event]) return;
  //   this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  //   // TODO: Close WebSocket connection if no listeners left?
  // },

  // notifyListeners(event: string, data: any): void {
  //   if (!this.listeners[event]) return;
  //   this.listeners[event].forEach(callback => {
  //     try {
  //       callback(data);
  //     } catch (error) {
  //       console.error(`Error in listener for event ${event}:`, error);
  //     }
  //   });
  // },

  // TODO: Setup WebSocket connection and message handling
  // setupWebSocket() { ... }
};

export default monitoringService;
