
import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import { Plane, ChevronDown, Info } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  animated?: boolean;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
  isDarkMode?: boolean;
  duration?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  price?: number;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  animated = true,
  type = 'direct',
  isActive = false,
  isDarkMode = false,
  duration = '',
  flightNumber = '',
  departureTime = '',
  arrivalTime = '',
  airline = '',
  price = 0
}) => {
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const [popupExpanded, setPopupExpanded] = useState(false);
  const animationRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const map = useMap();
  
  // Parse duration to get flight minutes for speed calculation
  const getFlightMinutes = () => {
    if (!duration) return 180; // Default duration
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180; // Default if parsing fails
  };
  
  // Calculate arc points for the flight path
  useEffect(() => {
    // Use less arc height to match reference image flat arc
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    const points = calculateArcPoints(
      departure.lat, 
      departure.lng, 
      arrival.lat, 
      arrival.lng,
      arcHeight
    );
    setArcPoints(points);
    
    // Initially set plane at departure
    setPlanePosition([departure.lat, departure.lng]);
    
    // Calculate initial bearing
    const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
    setPlaneRotation(bearing);
    
    // Calculate adaptive speed based on flight duration
    const flightMinutes = getFlightMinutes();
    const baseSpeed = 40; // milliseconds
    const maxDuration = 600; // 10 hours as max duration
    const minDuration = 60; // 1 hour as min duration
    const durationFactor = (flightMinutes - minDuration) / (maxDuration - minDuration);
    const speedFactor = Math.max(0.5, Math.min(2, 1 + durationFactor));
    const speed = Math.max(20, Math.min(80, baseSpeed * speedFactor));
    
    // Set starting point for flight animation - staggered starts
    // Use flight hash from flightNumber to create a more predictable but varied start time
    const hashCode = (s: string) => {
      return s.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
    };
    
    // Use a hash of flightNumber or fallback to random
    let hashValue = 0;
    if (flightNumber) {
      hashValue = Math.abs(hashCode(flightNumber));
    } else {
      hashValue = Math.floor(Math.random() * 100000);
    }
    
    const staggerOffset = hashValue % Math.floor(points.length / 3);
    let step = staggerOffset; // Staggered start within first third based on hash
    const totalSteps = points.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        setPlanePosition(points[step]);
        
        // Calculate bearing for rotation
        if (step < totalSteps - 1) {
          const currPoint = points[step];
          const nextPoint = points[step + 1];
          const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
          setPlaneRotation(bearing);
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed); // Use adaptive speed based on flight duration
        });
      } else {
        // Loop animation with pause at destination
        step = 0;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, 1000); // Longer pause before restart
        });
      }
    };
    
    // Start animation after a small delay based on hash to create staggered takeoffs
    setTimeout(() => {
      animate();
    }, (hashValue % 3000)); // Stagger up to 3 seconds for takeoff
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
    };
  }, [departure, arrival, animated, type, duration, flightNumber, map]);
  
  // Create a plane icon component that will be animated along the path
  useEffect(() => {
    if (!planePosition) return;
    
    // Remove previous marker if exists
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
    // Determine color based on flight type (matching the lines)
    const color = type === 'direct' ? '#4CAF50' : '#FFC107';
    
    // Create a plane SVG with proper rotation and tilt
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon"
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          background: 'white',
          borderRadius: '50%',
          padding: '4px',
          boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        }}
      >
        <Plane 
          size={20} 
          fill={color}
          color={color}
          style={{ 
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { icon: planeIcon });
    
    // Add click handler to show details
    marker.on('click', (e) => {
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true);
      setPopupExpanded(false); // Reset to collapsed state when opening new popup
    });
    
    marker.addTo(map);
    planeMarkerRef.current = marker;
    
    return () => {
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
    };
  }, [planePosition, planeRotation, map, type]);
  
  // Add click handler to the path to show details
  const handlePathHover = (e: L.LeafletMouseEvent) => {
    // Show minimal popup with airline info on hover
    setDetailsPosition([e.latlng.lat, e.latlng.lng]);
    setShowDetails(true);
    setPopupExpanded(false); // Start in collapsed state on hover
  };
  
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    // Toggle expanded details on click
    setDetailsPosition([e.latlng.lat, e.latlng.lng]);
    setShowDetails(true);
    setPopupExpanded(true); // Expand to show all details on click
  };
  
  // Create a popup component for flight details
  const FlightDetailsPopup = () => {
    if (!showDetails || !detailsPosition) return null;
    
    // Use Leaflet's popup with expandable content
    useEffect(() => {
      // Close any existing popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      
      // Create popup content based on expanded state
      const basicContent = `
        <div class="p-2 flight-popup">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-primary">${airline || 'Airline'} ${flightNumber}</h4>
            <div class="popup-expand-btn bg-primary/10 hover:bg-primary/20 rounded-full p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron ${popupExpanded ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div class="text-sm ${type === 'direct' ? 'text-[#4CAF50]' : 'text-[#FFC107]'} font-medium">
            ${type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
          </div>
          <div class="flex justify-between items-center text-sm mt-1">
            <div>${departure.code} → ${arrival.code}</div>
            <div class="text-muted-foreground">${duration}</div>
          </div>
        </div>
      `;
      
      const expandedContent = `
        <div class="p-3 flight-popup">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-primary">${airline || 'Airline'} ${flightNumber}</h4>
            <div class="popup-expand-btn bg-primary/10 hover:bg-primary/20 rounded-full p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron rotate-180"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div class="text-sm ${type === 'direct' ? 'text-[#4CAF50]' : 'text-[#FFC107]'} font-medium">
            ${type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
          </div>
          
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            <div class="col-span-2 flex justify-between items-center border-b pb-2 mb-1">
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span class="font-medium">Flight Info</span>
              </div>
              <div class="text-sm text-primary font-semibold">$${price}</div>
            </div>
            
            <div>
              <div class="text-xs text-muted-foreground">Departure</div>
              <div class="font-medium">${departure.code}</div>
              <div class="text-xs">${departure.city}</div>
              <div class="text-xs">${departureTime ? departureTime.split('T')[1]?.substring(0, 5) || departureTime : '-'}</div>
            </div>
            
            <div>
              <div class="text-xs text-muted-foreground">Arrival</div>
              <div class="font-medium">${arrival.code}</div>
              <div class="text-xs">${arrival.city}</div>
              <div class="text-xs">${arrivalTime ? arrivalTime.split('T')[1]?.substring(0, 5) || arrivalTime : '-'}</div>
            </div>
            
            <div class="col-span-2 mt-2">
              <div class="text-xs text-muted-foreground">Duration</div>
              <div class="font-medium">${duration}</div>
            </div>
          </div>
        </div>
      `;
      
      // Create popup with appropriate content
      const popup = L.popup({
        className: 'flight-details-popup',
        closeButton: true,
        closeOnClick: false,
        autoClose: false,
        autoPan: true,
        offset: [0, -10]
      })
        .setLatLng(detailsPosition)
        .setContent(popupExpanded ? expandedContent : basicContent)
        .openOn(map);
      
      popupRef.current = popup;
      
      // Add event listeners for expand/collapse button
      const expandBtn = document.querySelector('.popup-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setPopupExpanded(!popupExpanded);
        });
      }
      
      // Close popup when user clicks away
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        // Check if click is outside the popup
        const popupElement = document.querySelector('.flight-details-popup');
        if (popupElement && !popupElement.contains(e.originalEvent.target as Node)) {
          setShowDetails(false);
          map.removeEventListener('click', handleMapClick);
        }
      };
      
      map.addEventListener('click', handleMapClick);
      
      popup.on('remove', () => {
        setShowDetails(false);
        map.removeEventListener('click', handleMapClick);
      });
      
      return () => {
        if (popupRef.current) {
          map.closePopup(popupRef.current);
        }
        map.removeEventListener('click', handleMapClick);
      };
    }, [detailsPosition, showDetails, popupExpanded]);
    
    return null;
  };
  
  // Determine path colors based on mode and type
  const getPathOptions = () => {
    // Use more visibility for the flight paths
    let color;
    
    if (type === 'direct') {
      // Bright green like in the reference image
      color = '#4CAF50';
    } else {
      // Amber color for connecting flights
      color = '#FFC107';
    }
    
    return {
      color,
      opacity: 0.85,
      weight: 3,
      className: 'flight-path-solid',
      // Enable interactions
      interactive: true,
    };
  };
  
  return (
    <>
      <Polyline 
        positions={arcPoints}
        pathOptions={getPathOptions()}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            const path = e.target;
            path.setStyle({ weight: 5, opacity: 1 });
            handlePathHover(e.originalEvent as unknown as L.LeafletMouseEvent);
          },
          mouseout: (e) => {
            const path = e.target;
            path.setStyle({ weight: 3, opacity: 0.85 });
            // Don't hide popup on mouseout, let it stay until clicked away
          }
        }}
      />
      
      <FlightDetailsPopup />
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.7));
          cursor: pointer;
        }
        
        .custom-plane-icon {
          z-index: 1000;
          cursor: pointer;
        }
        
        .flight-details-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .flight-details-popup .leaflet-popup-content {
          margin: 8px 0;
          min-width: 220px;
        }
        
        .flight-details-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        
        .flight-popup {
          user-select: none;
        }
        
        .popup-expand-btn {
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .popup-expand-btn:hover {
          transform: scale(1.1);
        }
        
        .chevron {
          transition: transform 0.3s ease;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default FlightPath;
