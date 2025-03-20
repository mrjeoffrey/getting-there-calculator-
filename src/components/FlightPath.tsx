
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
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const [popupExpanded, setPopupExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'zooming' | 'drawing' | 'flying'>('idle');
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const drawingRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const drawingMarkerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  
  // Get flight minutes for speed calculation
  const getFlightMinutes = () => {
    if (!duration) return 180;
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180;
  };
  
  // Calculate arc points for the flight path
  useEffect(() => {
    // Use less arc height to match reference image flat arc
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    console.log("Departure:", departure);
console.log("Arrival:", arrival);

    
    const points = calculateArcPoints(
      departure.lat, 
      departure.lng, 
      arrival.lat, 
      arrival.lng,
      arcHeight
    );
    if (!points || points.length === 0) {
      console.error("ERROR: calculateArcPoints returned empty points!");
      return;
    }
  
    console.log("Generated Arc Points:", points);
    setArcPoints(points);
    arcPointsRef.current = points; 
    console.log("Generated Arc Points:", points); // Debugging
    
    // Start with no visible points - we'll animate them in
    setDisplayedPoints([arcPointsRef.current[0]]);
    
    // Calculate initial bearing
    if (departure && arrival) {
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
    }

    console.log(`Starting animation for flight from ${departure.code} to ${arrival.code}`);
    
    // Clean up previous animations and markers
    cleanup();
    
    // Start animation sequence with zooming to origin
    setTimeout(() => {
      console.log(`Starting zoom phase for ${departure.code} to ${arrival.code}`);
      startZoomingPhase();
    }, 500 + Math.random() * 1000); // Staggered start
    
    // Cleanup function
    return cleanup;
  }, [departure, arrival]);
  
  useEffect(() => {
    console.log("Updating arcPoints:", arcPoints);
  }, [arcPoints]);
  
  // Cleanup function to remove markers and cancel animations
  const cleanup = () => {
    console.log("Running cleanup...");
  
    console.log("Before cleanup, arcPoints:", arcPointsRef.current);
  
    if (animationRef.current) {
      console.log("Cancelling animation...");
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (drawingRef.current) {
      console.log("Cancelling drawing...");
      cancelAnimationFrame(drawingRef.current);
      drawingRef.current = null;
    }
    if (planeMarkerRef.current) {
      console.log("Removing plane marker...");
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    if (popupRef.current && map) {
      console.log("Closing popup...");
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    if (drawingMarkerRef.current) {
      console.log("Removing drawing marker...");
      drawingMarkerRef.current.remove();
      drawingMarkerRef.current = null;
    }
  
    console.log("After cleanup, arcPoints:", arcPointsRef.current);
  };
  
  
  
  // Start by zooming into the origin airport
  const startZoomingPhase = () => {
    setAnimationPhase('zooming');
    console.log(`Zoom phase active: Flying to ${departure.code}`);
    
    // Create a larger, more visible zoom animation marker
    const zoomMarkerHtml = ReactDOMServer.renderToString(
      <div className="zoom-animation-marker" style={{ visibility: 'visible', opacity: 1 }}>
        <div className="zoom-circle" style={{
          width: '80px',
          height: '80px',
          background: 'rgba(0, 120, 255, 0.5)',
          border: '4px solid rgba(0, 120, 255, 0.9)',
          borderRadius: '50%',
          boxShadow: '0 0 30px 10px rgba(0, 120, 255, 0.3)',
          animation: 'zoom-pulse 1.5s infinite',
          visibility: 'visible',
          opacity: 1
        }}></div>
      </div>
    );
    
    const zoomMarkerIcon = L.divIcon({
      html: zoomMarkerHtml,
      className: 'zoom-marker-icon',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });
    
    // Add a more visible temporary marker to highlight the zoom location
    const zoomMarker = L.marker([departure.lat, departure.lng], { 
      icon: zoomMarkerIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    // Zoom in with a more dramatic effect
    map.flyTo([departure.lat, departure.lng], 5, {
      duration: 2.5, // Longer duration for more visibility
      easeLinearity: 0.5
    });
    
    console.log(`Zooming to ${departure.code} at [${departure.lat}, ${departure.lng}]`);
    
    // After zoom completes, start drawing the path
    setTimeout(() => {
      console.log("arcPoints before zoom:", arcPoints);
      zoomMarker.remove();
      console.log("arcPoints before drawing:", arcPoints);
      console.log(`Zoom complete, starting drawing phase for ${departure.code} to ${arrival.code}`);
      startDrawingPhase();
    }, 2500); // Match the duration of the flyTo
  };
  
  // Enhanced line drawing animation with more visible feedback
  const startDrawingPhase = () => {
    if (!arcPoints.length) return;
    
    setAnimationPhase('drawing');
    console.log(`Drawing phase active: Creating path from ${departure.code} to ${arrival.code}`);
    
    // Initialize with just the starting point
    setDisplayedPoints([arcPoints[0]]);
    
    // Add a larger, more visible pulsing dot effect at the starting point
    const pulseMarkerHtml = ReactDOMServer.renderToString(
      <div className="drawing-animation-marker" style={{ 
        visibility: 'visible', 
        opacity: 1, 
        zIndex: 5000 
      }}>
        <div className="pulse-circle" style={{
          width: '30px',
          height: '30px',
          background: type === 'direct' ? '#4CAF50' : '#FFC107',
          borderRadius: '50%',
          boxShadow: '0 0 30px 10px rgba(255, 255, 255, 0.9)',
          animation: 'pulse-fast 0.8s infinite',
          visibility: 'visible',
          opacity: 1
        }}></div>
      </div>
    );
    
    const pulseMarkerIcon = L.divIcon({
      html: pulseMarkerHtml,
      className: 'drawing-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    // Create a moving marker that follows the drawing
    let drawingMarker = L.marker(arcPoints[0], { 
      icon: pulseMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    drawingMarkerRef.current = drawingMarker;
    
    // Make drawing MUCH slower and more visible
    const drawingDuration = 4000; // 4 seconds for drawing
    const totalPoints = arcPoints.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16))); // 16ms per frame approx
    
    let currentPointIndex = 1; // Start from 1 since we already have the first point
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        console.log(`Drawing complete for ${departure.code} to ${arrival.code}`);
        if (drawingMarkerRef.current) {
          drawingMarkerRef.current.remove();
          drawingMarkerRef.current = null;
        }
        
        // Drawing complete, show larger, more visible confirmation and start flying
        const completionMarkerHtml = ReactDOMServer.renderToString(
          <div className="completion-marker" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            background: type === 'direct' ? '#4CAF50' : '#FFC107',
            borderRadius: '50%',
            color: 'white',
            boxShadow: '0 0 0 15px rgba(76, 175, 80, 0.4), 0 0 30px rgba(0, 0, 0, 0.5)',
            animation: 'scale-pop 0.5s ease-out',
            visibility: 'visible',
            opacity: 1,
            zIndex: 5000
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
        
        const completionIcon = L.divIcon({
          html: completionMarkerHtml,
          className: 'completion-icon',
          iconSize: [60, 60],
          iconAnchor: [30, 30]
        });
        
        // Show checkmark at destination
        const completionMarker = L.marker(arcPoints[arcPoints.length - 1], { 
          icon: completionIcon,
          zIndexOffset: 5000
        }).addTo(map);
        
        // Fit view to see the entire flight path before plane starts
        if (departure && arrival) {
          map.fitBounds(L.latLngBounds([
            [departure.lat, departure.lng],
            [arrival.lat, arrival.lng]
          ]), { 
            padding: [50, 50],
            duration: 1
          });
        }
        
        // Remove the completion marker after a short delay
        setTimeout(() => {
          completionMarker.remove();
          console.log(`Starting flying phase for ${departure.code} to ${arrival.code}`);
          startFlyingPhase();
        }, 1500); // Longer delay for more visibility
        
        return;
      }
      
      // Add next batch of points
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      const newPoints = arcPoints.slice(0, newIndex);
      setDisplayedPoints(newPoints);
      
      // Move the drawing marker to the latest point
      if (drawingMarkerRef.current && newIndex > 0 && newPoints[newIndex - 1]) {
        drawingMarkerRef.current.setLatLng(newPoints[newIndex - 1]);
      }
      
      currentPointIndex = newIndex;
      
      // Continue drawing with visible animation
      drawingRef.current = requestAnimationFrame(() => {
        setTimeout(drawNextSegment, 16); // Slightly delay for more visible animation
      });
    };
    
    // Start drawing animation with a slight delay
    setTimeout(() => {
      console.log(`Starting to draw path segments for ${departure.code} to ${arrival.code}`);
      drawingRef.current = requestAnimationFrame(drawNextSegment);
    }, 300);
  };
  
  // Start the plane flying animation after line is drawn with more visual feedback
  const startFlyingPhase = () => {
    setAnimationPhase('flying');
    console.log(`Flying phase active: Plane taking off from ${departure.code} to ${arrival.code}`);
    
    // Create a larger, more visible takeoff effect at the departure airport
    const takeoffMarkerHtml = ReactDOMServer.renderToString(
      <div className="takeoff-animation" style={{ visibility: 'visible', opacity: 1, zIndex: 5000 }}>
        <div className="takeoff-rays" style={{
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '50%',
          boxShadow: '0 0 0 30px rgba(255, 255, 255, 0.2), 0 0 50px rgba(255, 255, 255, 0.7)',
          animation: 'takeoff-pulse 1s infinite',
          visibility: 'visible',
          opacity: 1
        }}></div>
      </div>
    );
    
    const takeoffMarkerIcon = L.divIcon({
      html: takeoffMarkerHtml,
      className: 'takeoff-marker-icon',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });
    
    // Add a temporary marker for takeoff effect
    const takeoffMarker = L.marker([departure.lat, departure.lng], { 
      icon: takeoffMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    
    // Initialize with plane at departure
    if (departure) {
      setPlanePosition([departure.lat, departure.lng]);
    }
    
    // Make the animation much slower for better visibility
    // Use a slower speed so users can clearly see the plane moving
    const speed = 80; // milliseconds - slower to make animation more visible
    
    let step = 0; // Start from beginning
    const totalSteps = arcPoints.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        const point = arcPoints[step];
        if (point) {
          setPlanePosition([point[0], point[1]]);
          
          // Calculate bearing for rotation
          if (step < totalSteps - 1) {
            const currPoint = arcPoints[step];
            const nextPoint = arcPoints[step + 1];
            if (currPoint && nextPoint) {
              const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
              setPlaneRotation(bearing);
            }
          }
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed);
        });
      } else {
        // Show arrival animation
        if (arrival) {
          const arrivalMarkerHtml = ReactDOMServer.renderToString(
            <div className="arrival-animation" style={{ visibility: 'visible', opacity: 1, zIndex: 5000 }}>
              <div className="arrival-pulse" style={{
                width: '80px',
                height: '80px',
                background: 'rgba(76, 175, 80, 0.5)',
                border: '5px solid rgba(76, 175, 80, 0.9)',
                borderRadius: '50%',
                boxShadow: '0 0 0 20px rgba(76, 175, 80, 0.3), 0 0 50px rgba(76, 175, 80, 0.8)',
                animation: 'arrival-pulse 1s infinite',
                visibility: 'visible',
                opacity: 1
              }}></div>
            </div>
          );
          
          const arrivalMarkerIcon = L.divIcon({
            html: arrivalMarkerHtml,
            className: 'arrival-marker-icon',
            iconSize: [80, 80],
            iconAnchor: [40, 40]
          });
          if (!map) {
            console.error("ERROR: Leaflet map is undefined when adding marker.");
            return;
          }
          
          if (!arrival || !arrival.lat || !arrival.lng) {
            console.error("ERROR: Arrival data is missing:", arrival);
            return;
          }
          // Add a temporary marker for arrival effect
          const arrivalMarker = L.marker([arrival.lat, arrival.lng], { 
            icon: arrivalMarkerIcon,
            zIndexOffset: 5000
          }).addTo(map);
          
          // Remove after animation completes
          setTimeout(() => {
            arrivalMarker.remove();
            setAnimationComplete(true);
          }, 3000); // Longer display time for arrival effect
        }
        
        // Remove takeoff marker
        takeoffMarker.remove();
        
        // Mark animation as complete
        console.log(`Flight animation complete for ${departure.code} to ${arrival.code}`);
        setAnimationComplete(true);
        
        // Loop animation with pause at destination
        setTimeout(() => {
          if (Math.random() > 0.5) { // Only restart some flights to avoid too much movement
            step = 0;
            animationRef.current = requestAnimationFrame(() => {
              animate(); // Restart animation
            });
          }
        }, 8000); // Longer pause before restart
      }
    };
    
    // Start animation after a short delay
    setTimeout(() => {
      console.log(`Plane taking off from ${departure.code}`);
      animate();
    }, 1000); // Longer delay for more visibility
  };
  
  // Create a plane icon component that will be animated along the path
  useEffect(() => {
    if (!planePosition) return;
    
    // Remove previous marker if exists
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
    // Determine color based on flight type (matching the lines)
    const color = type === 'direct' ? '#4CAF50' : '#FFC107';
    
    // Create a plane SVG with proper rotation and tilt - make it MUCH larger
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon"
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          background: 'white',
          borderRadius: '50%',
          padding: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          visibility: 'visible',
          opacity: 1,
          zIndex: 5000
        }}
      >
        <Plane 
          size={60} // Much larger plane
          fill={color}
          color={color}
          style={{ 
            filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.6))',
            visibility: 'visible',
            opacity: 1
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [80, 80], // Larger size for better visibility
      iconAnchor: [40, 40]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { 
      icon: planeIcon,
      zIndexOffset: 5000 // Ensure it's above everything
    });
    
    // Add click handler to show details
    marker.on('click', (e) => {
      if (e.originalEvent && e.latlng) {
        setDetailsPosition([e.latlng.lat, e.latlng.lng]);
        setShowDetails(true);
        setPopupExpanded(true); // Start with expanded view on direct click
      }
    });
    
    marker.addTo(map);
    planeMarkerRef.current = marker;
    
    return () => {
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
    };
  }, [planePosition, planeRotation, map, type]);
  
  // Handle hover/click on flight path
  const handlePathHover = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      // Show basic popup with airline info on hover
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true);
      setPopupExpanded(false); // Collapsed state on hover
    }
  };
  
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      // Show expanded details on click
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true); 
      setPopupExpanded(true); // Expanded state on click
    }
  };
  
  // Create a popup component for flight details
  const FlightDetailsPopup = () => {
    if (!showDetails || !detailsPosition || !departure || !arrival) return null;
    
    // Use Leaflet's popup with expandable content
    useEffect(() => {
      // Close any existing popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      
      // Create popup content based on expanded state
      const basicContent = `
        <div class="p-3 flight-popup">
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
        <div class="p-4 flight-popup">
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
      
      // Create popup with appropriate content and make sure it closes with close button only
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
      
      // Only close popup when user clicks the close button
      popup.on('remove', () => {
        setShowDetails(false);
      });
      
      // Prevent map click from closing the popup
      const popupElement = document.querySelector('.flight-details-popup');
      if (popupElement) {
        popupElement.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
      
      return () => {
        if (popupRef.current) {
          map.closePopup(popupRef.current);
        }
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
      opacity: 0.9,
      weight: 4,
      className: 'flight-path-solid',
      // Enable interactions
      interactive: true,
    };
  };
  
  return (
    <>
      {/* Draw only the currently displayed points from the animation */}
      <Polyline 
        positions={animationPhase === 'idle' ? [] : displayedPoints}
        pathOptions={{
          ...getPathOptions(),
          dashArray: animationPhase === 'drawing' ? '5, 10' : null, // Dashed line during drawing
          dashOffset: animationPhase === 'drawing' ? '10' : null,
          weight: animationPhase === 'drawing' ? 6 : 4, // Thicker line during drawing
        }}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 6, opacity: 1 });
              if (e.originalEvent) {
                handlePathHover(e.originalEvent as unknown as L.LeafletMouseEvent);
              }
            }
          },
          mouseout: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ 
                weight: animationPhase === 'drawing' ? 6 : 4, 
                opacity: 0.9 
              });
              // Don't hide popup on mouseout, let it stay until closed
            }
          }
        }}
      />
      
      <FlightDetailsPopup />
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1));
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 450 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        .custom-plane-icon {
          z-index: 5000 !important;
          cursor: pointer;
          transition: transform 0.3s ease;
          transform-origin: center center;
          animation: pulse-plane 2s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        @keyframes pulse-plane {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
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
        
        /* Enhanced animation markers */
        .zoom-animation-marker {
          position: relative;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .zoom-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(0, 120, 255, 0.4);
          border: 4px solid rgba(0, 120, 255, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 30px 10px rgba(0, 120, 255, 0.3);
          animation: zoom-pulse 1.5s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .drawing-animation-marker {
          position: relative;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 30px 10px rgba(255, 255, 255, 0.9);
          animation: pulse-fast 0.8s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .completion-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: #4CAF50;
          border-radius: 50%;
          color: white;
          box-shadow: 0 0 0 15px rgba(76, 175, 80, 0.4), 0 0 30px rgba(0, 0, 0, 0.5);
          animation: scale-pop 0.5s ease-out;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .takeoff-animation {
          position: relative;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .takeoff-rays {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.2), 0 0 50px rgba(255, 255, 255, 0.7);
          animation: takeoff-pulse 1s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .arrival-animation {
          position: relative;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .arrival-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(76, 175, 80, 0.5);
          border: 5px solid rgba(76, 175, 80, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 0 20px rgba(76, 175, 80, 0.3), 0 0 50px rgba(76, 175, 80, 0.8);
          animation: arrival-pulse 1s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Enhanced keyframe animations */
        @keyframes zoom-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        
        @keyframes pulse-fast {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
        }
        
        @keyframes scale-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes takeoff-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
        }
        
        @keyframes arrival-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Fix popup flickering */
        .leaflet-popup {
          pointer-events: auto !important;
          z-index: 6000 !important;
        }
        
        .leaflet-popup-content-wrapper {
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content {
          pointer-events: auto !important;
        }
        
        /* Only close popup when close button is clicked */
        .leaflet-popup-close-button {
          display: block !important;
          z-index: 6100 !important;
        }
        
        /* Ensure flight paths and planes have high z-index */
        .leaflet-pane {
          z-index: 400 !important;
          visibility: visible !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 450 !important;
          visibility: visible !important;
        }
        
        svg.leaflet-zoom-animated {
          z-index: 450 !important;
          visibility: visible !important;
        }
        
        .custom-plane-icon {
          z-index: 5000 !important;
          visibility: visible !important;
        }
        
        /* Make sure all markers and animations are visible */
        .zoom-marker-icon, .drawing-marker-icon, .completion-icon, .takeoff-marker-icon, .arrival-marker-icon {
          z-index: 5000 !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Ensure map panes are in correct order */
        .leaflet-map-pane {
          z-index: 100 !important;
        }
        
        .leaflet-tile-pane {
          z-index: 200 !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 400 !important;
        }
        
        .leaflet-marker-pane {
          z-index: 600 !important;
        }
      `}</style>
    </>
  );
};

export default FlightPath;
