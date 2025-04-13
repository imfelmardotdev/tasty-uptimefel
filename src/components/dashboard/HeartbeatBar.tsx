import React, { useState, useEffect, useRef, useMemo } from "react";
import dayjs from "dayjs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Assuming shadcn/ui tooltip

// Define status constants (adjust values if needed)
const UP = 1;
const DOWN = 0;
const PENDING = 2;
const MAINTENANCE = 3;

interface Heartbeat {
  id: number;
  website_id: number;
  timestamp: string | Date; // ISO string or Date object
  status: number;
  ping?: number | null;
  message?: string | null;
}

interface HeartbeatBarProps {
  monitorId: number;
  heartbeats: Heartbeat[]; // Expecting an array of heartbeat objects
  size?: "small" | "mid" | "big";
  maxBeats?: number; // Optional: Max beats to display directly
}

const HeartbeatBar: React.FC<HeartbeatBarProps> = ({
  monitorId,
  heartbeats = [], // Default to empty array
  size = "big",
  maxBeats: initialMaxBeats, // Rename prop
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [maxBeatState, setMaxBeatState] = useState<number>(initialMaxBeats || 50); // Default or prop value
  const [isMounted, setIsMounted] = useState(false);

  // --- Style Calculations ---
  const { beatWidth, beatHeight, beatHoverAreaPadding, hoverScale } = useMemo(() => {
    let width = 10;
    let height = 30;
    let padding = 4;
    let scale = 1.5;

    if (size !== "big") {
      width = 5;
      height = 16;
      padding = 2;
    }

    // Adjust for device pixel ratio to avoid rendering issues
    if (typeof window !== 'undefined') {
        const actualWidth = width * window.devicePixelRatio;
        const actualPadding = padding * window.devicePixelRatio;
        if (!Number.isInteger(actualWidth)) {
            width = Math.round(actualWidth) / window.devicePixelRatio;
        }
        if (!Number.isInteger(actualPadding)) {
            padding = Math.round(actualPadding) / window.devicePixelRatio;
        }
    }


    return { beatWidth: width, beatHeight: height, beatHoverAreaPadding: padding, hoverScale: scale };
  }, [size]);

  // --- Max Beats Calculation ---
  useEffect(() => {
    setIsMounted(true); // Indicate component has mounted
    const calculateMaxBeats = () => {
      if (wrapRef.current && !initialMaxBeats) { // Only calculate if not explicitly set
        const wrapWidth = wrapRef.current.clientWidth;
        const singleBeatTotalWidth = beatWidth + beatHoverAreaPadding * 2;
        if (singleBeatTotalWidth > 0) {
          setMaxBeatState(Math.max(1, Math.floor(wrapWidth / singleBeatTotalWidth))); // Ensure at least 1 beat
        }
      }
    };

    calculateMaxBeats(); // Initial calculation

    // Recalculate on resize if maxBeats wasn't provided
    if (!initialMaxBeats) {
        const handleResize = () => calculateMaxBeats();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }
  }, [beatWidth, beatHoverAreaPadding, initialMaxBeats]); // Rerun if size changes or initialMaxBeats changes

  // --- Displayed Beats Logic ---
  const displayedBeats = useMemo(() => {
    if (!heartbeats || heartbeats.length === 0 || !isMounted) {
      return Array(maxBeatState).fill({ status: -1, placeholder: true }); // Fill with placeholders if no data or not mounted
    }

    const numBeats = heartbeats.length;
    const beatsToDisplay = Math.min(numBeats, maxBeatState);
    const startIndex = numBeats - beatsToDisplay;
    const visible = heartbeats.slice(startIndex);

    const paddingCount = maxBeatState - visible.length;
    const padding = Array(paddingCount).fill({ status: -1, placeholder: true }); // Placeholder object

    return [...padding, ...visible];
  }, [heartbeats, maxBeatState, isMounted]); // Depend on isMounted

  // --- Styles ---
  const wrapStyle: React.CSSProperties = {
    paddingTop: `${((beatHeight * hoverScale) - beatHeight) / 2}px`,
    paddingBottom: `${((beatHeight * hoverScale) - beatHeight) / 2}px`,
    // paddingLeft: `${((beatWidth * hoverScale) - beatWidth) / 2}px`, // Usually not needed
    // paddingRight: `${((beatWidth * hoverScale) - beatWidth) / 2}px`,
    width: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    display: 'flex', // Use flexbox for alignment
    alignItems: 'center', // Center beats vertically
    minHeight: beatHeight * hoverScale, // Ensure wrap has enough height
  };

  const barStyle: React.CSSProperties = {
    display: "inline-flex", // Use inline-flex for the bar itself
    transition: "transform ease-in-out 0.25s", // Animate transform for potential future use
    transform: "translateX(0)", // Default transform
    height: beatHeight, // Set height for alignment
  };

  const beatHoverAreaStyle: React.CSSProperties = {
    padding: `${beatHoverAreaPadding}px`,
    display: 'inline-block', // Ensure areas are inline
    // --hover-scale CSS variable is not directly usable in React inline styles easily
    // Hover effect handled by CSS or styled-components if needed
  };

  const getBeatStyle = (beat: Heartbeat | { status: number, placeholder?: boolean }): React.CSSProperties => {
    let backgroundColor = "aliceblue"; // Default/Placeholder color

    // Check if it's a real heartbeat object (has timestamp) and not a placeholder
    if (beat && typeof beat === 'object' && 'timestamp' in beat && !('placeholder' in beat && beat.placeholder)) {
         switch (beat.status) {
            case UP: // 1
                backgroundColor = "#10b981"; // Direct Green
                break;
            case DOWN: // 0
                backgroundColor = "#ef4444"; // Direct Red
                break;
            case PENDING: // 2
                backgroundColor = "#f59e0b"; // Direct Yellow
                break;
            case MAINTENANCE: // 3
                 backgroundColor = "#3b82f6"; // Direct Blue
                 break;
            default:
                 backgroundColor = "#d1d5db"; // Gray for unknown status
         }
    } else {
        // It's a placeholder or invalid data
        backgroundColor = "aliceblue";
    }

    return {
      width: `${beatWidth}px`,
      height: `${beatHeight}px`,
      backgroundColor,
      borderRadius: "var(--radius, 0.25rem)", // Use CSS variable or default
      display: 'inline-block', // Ensure beats are inline
      verticalAlign: 'middle', // Align beats vertically if needed
      transition: 'transform 0.15s ease-in-out, opacity 0.15s ease-in-out', // For hover effect
      cursor: (!('placeholder' in beat) || !beat.placeholder) ? 'pointer' : 'default',
    };
  };

  const getBeatTitle = (beat: Heartbeat | { status: number, placeholder?: boolean }): string => {
    if ('placeholder' in beat && beat.placeholder) {
      return "No data";
    }
    // Type guard to ensure beat is a Heartbeat object
    if (!('timestamp' in beat)) {
        return "Invalid data"; // Should not happen if not a placeholder
    }
    const timeStr = dayjs(beat.timestamp).format("YYYY-MM-DD HH:mm:ss"); // Format as needed
    const msg = beat.message ? ` - ${beat.message}` : "";
    const ping = beat.ping !== null && beat.ping !== undefined ? ` (${beat.ping}ms)` : "";
    let statusText = "Unknown";
     switch (beat.status) {
          case UP: statusText = "Up"; break;
          case DOWN: statusText = "Down"; break;
          case PENDING: statusText = "Pending"; break;
          case MAINTENANCE: statusText = "Maintenance"; break;
     }
    return `${timeStr} - ${statusText}${ping}${msg}`;
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div ref={wrapRef} style={wrapStyle} className="heartbeat-bar-wrap">
        <div style={barStyle} className="heartbeat-bar">
          {displayedBeats.map((beat, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                 <div
                    className={`beat-hover-area ${('placeholder' in beat && beat.placeholder) ? 'empty' : ''}`}
                    style={beatHoverAreaStyle}
                    // Add hover effect via CSS if preferred
                    onMouseEnter={(e) => {
                        if (!('placeholder' in beat) || !beat.placeholder) {
                            (e.currentTarget.firstChild as HTMLElement).style.transform = `scale(${hoverScale})`;
                            (e.currentTarget.firstChild as HTMLElement).style.opacity = '0.8';
                        }
                    }}
                    onMouseLeave={(e) => {
                         if (!('placeholder' in beat) || !beat.placeholder) {
                            (e.currentTarget.firstChild as HTMLElement).style.transform = 'scale(1)';
                            (e.currentTarget.firstChild as HTMLElement).style.opacity = '1';
                         }
                    }}
                 >
                    <div
                      className={`beat ${('placeholder' in beat && beat.placeholder) ? 'empty' : `status-${beat.status}`}`} // Add status class
                      style={getBeatStyle(beat)}
                    />
                 </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getBeatTitle(beat)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {/* Optional: Add time indicators similar to Vue version if needed */}
      </div>
    </TooltipProvider>
  );
};

export default HeartbeatBar;
