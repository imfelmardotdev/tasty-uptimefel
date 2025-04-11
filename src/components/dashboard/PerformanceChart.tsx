import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle } from "lucide-react";

interface PerformanceChartProps {
  websiteId?: string;
  websiteName?: string;
  performanceData?: PerformanceDataPoint[];
  thresholdMs?: number;
}

interface PerformanceDataPoint {
  timestamp: string;
  responseTime: number;
  status: "up" | "down";
}

const PerformanceChart = ({
  websiteId = "1",
  websiteName = "Example Website",
  performanceData = generateMockData(),
  thresholdMs = 2000,
}: PerformanceChartProps) => {
  const [timeRange, setTimeRange] = useState("24h");

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">
            Performance History
          </CardTitle>
          <Select defaultValue={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="response-time">
          <TabsList className="mb-4">
            <TabsTrigger value="response-time">Response Time</TabsTrigger>
            <TabsTrigger value="uptime">Uptime</TabsTrigger>
          </TabsList>

          <TabsContent value="response-time" className="h-[280px]">
            <div className="relative h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Response Time (ms)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    domain={[0, "dataMax + 500"]}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} ms`, "Response Time"]}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {/* Threshold line */}
                  <Line
                    type="monotone"
                    dataKey={() => thresholdMs}
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Threshold indicator */}
              <div className="absolute top-0 right-0 flex items-center text-xs text-red-500 bg-red-50 p-1 rounded">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>Threshold: {thresholdMs}ms</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="uptime" className="h-[280px]">
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Uptime chart coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to generate mock data
function generateMockData(): PerformanceDataPoint[] {
  const data: PerformanceDataPoint[] = [];
  const now = new Date();

  // Generate 24 hours of data points (one per hour)
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(
      now.getTime() - i * 60 * 60 * 1000,
    ).toISOString();
    const responseTime = Math.floor(Math.random() * 1500) + 200; // Between 200ms and 1700ms
    const status = responseTime > 2000 ? "down" : "up";

    data.push({
      timestamp,
      responseTime,
      status,
    });
  }

  return data;
}

export default PerformanceChart;
