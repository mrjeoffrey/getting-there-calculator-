
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
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'zooming' | 'drawing' | 'flying'>('idle');
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const drawingRef = useRef<number | null>(null);
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
    
    // Start with no visible points - we'll animate them in
    setDisplayedPoints([]);
    
    // Calculate initial bearing
    if (departure && arrival) {
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
    }

    console.log(`Starting animation for flight from ${departure.code} to ${arrival.code}`);
    
    // Start animation sequence with zooming to origin
    setTimeout(() => {
      console.log(`Starting zoom phase for ${departure.code} to ${arrival.code}`);
      startZoomingPhase();
    }, 500 + Math.random() * 1000); // Staggered start
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (drawingRef.current) {
        cancelAnimationFrame(drawingRef.current);
      }
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
    };
  }, [departure, arrival, type]);
  
  // Start by zooming into the origin airport with a more noticeable animation
  const startZoomingPhase = () => {
    setAnimationPhase('zooming');
    console.log(`Zoom phase active: Flying to ${departure.code}`);
    
    // Create a zoom animation marker
    const zoomMarkerHtml = ReactDOMServer.renderToString(
      <div className="zoom-animation-marker">
        <div className="zoom-circle"></div>
      </div>
    );
    
    const zoomMarkerIcon = L.divIcon({
      html: zoomMarkerHtml,
      className: 'zoom-marker-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    
    // Add a temporary marker to highlight the zoom location
    const zoomMarker = L.marker([departure.lat, departure.lng], { 
      icon: zoomMarkerIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    // Zoom in with a more dramatic effect
    map.flyTo([departure.lat, departure.lng], 6, {
      duration: 2.0,
      easeLinearity: 0.5
    });
    
    console.log(`Zooming to ${departure.code} at [${departure.lat}, ${departure.lng}]`);
    
    // After zoom completes, start drawing the path
    setTimeout(() => {
      zoomMarker.remove();
      console.log(`Zoom complete, starting drawing phase for ${departure.code} to ${arrival.code}`);
      startDrawingPhase();
    }, 2000);
  };
  
  // Enhanced line drawing animation with more visual feedback
  const startDrawingPhase = () => {
    if (!arcPoints.length) return;
    
    setAnimationPhase('drawing');
    console.log(`Drawing phase active: Creating path from ${departure.code} to ${arrival.code}`);
    
    // Initialize with just the starting point
    setDisplayedPoints([arcPoints[0]]);
    
    // Add a pulsing dot effect at the starting point
    const pulseMarkerHtml = ReactDOMServer.renderToString(
      <div className="drawing-animation-marker">
        <div className="pulse-circle"></div>
      </div>
    );
    
    const pulseMarkerIcon = L.divIcon({
      html: pulseMarkerHtml,
      className: 'drawing-marker-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    
    // Create a moving marker that follows the drawing
    let drawingMarker = L.marker(arcPoints[0], { 
      icon: pulseMarkerIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    // Make drawing slower and more visible
    const drawingDuration = 3000; // 3 seconds
    const totalPoints = arcPoints.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16))); // 16ms per frame approx
    
    let currentPointIndex = 1; // Start from 1 since we already have the first point
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        console.log(`Drawing complete for ${departure.code} to ${arrival.code}`);
        drawingMarker.remove();
        
        // Drawing complete, show confirmation and start flying
        const completionMarkerHtml = ReactDOMServer.renderToString(
          <div className="completion-marker">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
        
        const completionIcon = L.divIcon({
          html: completionMarkerHtml,
          className: 'completion-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        
        // Show checkmark at destination
        const completionMarker = L.marker(arcPoints[arcPoints.length - 1], { 
          icon: completionIcon,
          zIndexOffset: 1000
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
        }, 1000);
        
        return;
      }
      
      // Add next batch of points
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      const newPoints = arcPoints.slice(0, newIndex);
      setDisplayedPoints(newPoints);
      
      // Move the drawing marker to the latest point
      if (drawingMarker && newIndex > 0 && newPoints[newIndex - 1]) {
        drawingMarker.setLatLng(newPoints[newIndex - 1]);
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
    }, 500);
  };
  
  // Start the plane flying animation after line is drawn with more visual feedback
  const startFlyingPhase = () => {
    setAnimationPhase('flying');
    console.log(`Flying phase active: Plane taking off from ${departure.code} to ${arrival.code}`);
    
    // Create a takeoff effect at the departure airport
    const takeoffMarkerHtml = ReactDOMServer.renderToString(
      <div className="takeoff-animation">
        <div className="takeoff-rays"></div>
      </div>
    );
    
    const takeoffMarkerIcon = L.divIcon({
      html: takeoffMarkerHtml,
      className: 'takeoff-marker-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    
    // Add a temporary marker for takeoff effect
    const takeoffMarker = L.marker([departure.lat, departure.lng], { 
      icon: takeoffMarkerIcon,
      zIndexOffset: 999
    }).addTo(map);
    
    // Initialize with plane at departure
    if (departure) {
      setPlanePosition([departure.lat, departure.lng]);
    }
    
    // Use a shorter/faster animation for better visibility
    // Most flights are only a few seconds now, so users can see them move
    const speed = 40; // milliseconds - faster to make animation more visible
    
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
            <div className="arrival-animation">
              <div className="arrival-pulse"></div>
            </div>
          );
          
          const arrivalMarkerIcon = L.divIcon({
            html: arrivalMarkerHtml,
            className: 'arrival-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          // Add a temporary marker for arrival effect
          const arrivalMarker = L.marker([arrival.lat, arrival.lng], { 
            icon: arrivalMarkerIcon,
            zIndexOffset: 999
          }).addTo(map);
          
          // Remove after animation completes
          setTimeout(() => {
            arrivalMarker.remove();
            setAnimationComplete(true);
          }, 2000);
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
    }, 500);
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
    
    // Create a plane SVG with proper rotation and tilt
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon"
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          background: 'white',
          borderRadius: '50%',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <Plane 
          size={24} // Slightly larger plane
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
      iconSize: [36, 36], // Larger size for better visibility
      iconAnchor: [18, 18]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { icon: planeIcon });
    
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
      opacity: 0.85,
      weight: 3,
      className: 'flight-path-solid',
      // Enable interactions
      interactive: true,
    };
  };
  
  // Render animation indicator based on phase
  const renderAnimationIndicator = () => {
    if (animationPhase === 'idle') return null;
    
    return (
      <div className="animation-phase-indicator">
        {animationPhase === 'zooming' && <div className="zoom-indicator"></div>}
        {animationPhase === 'drawing' && <div className="drawing-indicator"></div>}
        {animationPhase === 'flying' && <div className="flying-indicator"></div>}
      </div>
    );
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
        }}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 5, opacity: 1 });
              if (e.originalEvent) {
                handlePathHover(e.originalEvent as unknown as L.LeafletMouseEvent);
              }
            }
          },
          mouseout: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 3, opacity: 0.85 });
              // Don't hide popup on mouseout, let it stay until closed
            }
          }
        }}
      />
      
      <FlightDetailsPopup />
      {renderAnimationIndicator()}
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.9));
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .custom-plane-icon {
          z-index: 1000;
          cursor: pointer;
          transition: transform 0.3s ease;
          transform-origin: center center;
          animation: pulse-plane 2s infinite;
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
        }
        
        .zoom-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(0, 120, 255, 0.2);
          border: 2px solid rgba(0, 120, 255, 0.8);
          border-radius: 50%;
          animation: zoom-pulse 1.5s infinite;
        }
        
        .drawing-animation-marker {
          position: relative;
        }
        
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          animation: pulse-fast 0.8s infinite;
        }
        
        .completion-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #4CAF50;
          border-radius: 50%;
          color: white;
          animation: scale-pop 0.5s ease-out;
        }
        
        .takeoff-animation {
          position: relative;
        }
        
        .takeoff-rays {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.1);
          animation: takeoff-pulse 1s infinite;
        }
        
        .arrival-animation {
          position: relative;
        }
        
        .arrival-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: rgba(76, 175, 80, 0.3);
          border: 2px solid rgba(76, 175, 80, 0.8);
          border-radius: 50%;
          animation: arrival-pulse 1s infinite;
        }
        
        /* Animation phase indicators */
        .zoom-indicator {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid white;
          animation: zoom-pulse 1s infinite;
          pointer-events: none;
        }
        
        .drawing-indicator {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          animation: draw-move 2s infinite;
          pointer-events: none;
        }
        
        .flying-indicator {
          position: absolute;
          width: 40px;
          height: 10px;
          background: rgba(255, 255, 255, 0.6);
          filter: blur(4px);
          animation: fly-pulse 1s infinite;
          pointer-events: none;
        }
        
        /* Enhanced keyframe animations */
        @keyframes zoom-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        @keyframes pulse-fast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        
        @keyframes scale-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes takeoff-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }
        
        @keyframes arrival-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0.4; }
        }
        
        @keyframes draw-move {
          0% { transform: translateX(0); opacity: 0.8; }
          100% { transform: translateX(100px); opacity: 0.2; }
        }
        
        @keyframes fly-pulse {
          0%, 100% { opacity: 0.4; width: 40px; }
          50% { opacity: 0.8; width: 60px; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Fix popup flickering */
        .leaflet-popup {
          pointer-events: auto !important;
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
        }
      `}</style>
    </>
  );
};

export default FlightPath;
